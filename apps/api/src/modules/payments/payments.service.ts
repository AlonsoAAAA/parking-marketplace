import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';
import { QrService } from '../qr/qr.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { VehiculosMxService } from '../vehiculos-mx/vehiculos-mx.service';

export interface VehicleChangeDto {
  plate: string;
  make: string;
  model: string;
  version?: string;
  year?: number;
  color?: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
    private qrService: QrService,
    private notificationsService: NotificationsService,
    private pricingService: PricingService,
    private vehiculos: VehiculosMxService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  // Precio final (sin promoción) para una reserva — compartido entre la
  // creación del Payment Intent y la aplicación posterior de un código.
  private async computeReservationPrice(reservationId: string, userId: string) {
    const result = await this.dataSource.query(
      `SELECT r.id, r.status, r.expires_at, r.vehicle_type, r.event_id,
              COALESCE(r.parking_id, e.parking_id) AS parking_id,
              e.name     AS event_name,
              e.starts_at,
              e.price    AS event_base_price,
              e.venue_id,
              -- Precio de contrato desde parking_slots_pricing
              sp.price   AS contract_price,
              -- Distancia estacionamiento → venue (table: venue_parkings)
              COALESCE(vp.distance_meters, 500) AS distance_meters,
              -- Slots totales y ocupados para calcular demanda
              COALESCE(sp.slots, 0)             AS total_slots,
              (SELECT COUNT(*) FROM reservations r2
               WHERE r2.parking_id = COALESCE(r.parking_id, e.parking_id)
                 AND r2.event_id   = r.event_id
                 AND r2.status NOT IN ('cancelled','expired')
              )::int                            AS reserved_slots
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN parking_slots_pricing sp
              ON sp.parking_id   = COALESCE(r.parking_id, e.parking_id)
             AND sp.vehicle_type = r.vehicle_type
       LEFT JOIN venue_parkings vp
              ON vp.parking_id = COALESCE(r.parking_id, e.parking_id)
             AND vp.venue_id   = e.venue_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [reservationId, userId],
    );

    if (!result.length) throw new BadRequestException('Reserva no encontrada');

    const reservation = result[0];

    if (reservation.status !== 'pending') {
      throw new BadRequestException('Esta reserva ya no está disponible');
    }

    if (new Date(reservation.expires_at) < new Date()) {
      throw new BadRequestException('La reserva ha expirado');
    }

    const contractPrice = reservation.contract_price
      ? parseFloat(reservation.contract_price)
      : parseFloat(reservation.event_base_price);   // fallback al precio base del evento

    const distanceKm        = parseFloat(reservation.distance_meters) / 1000;
    const anticipationHours = (new Date(reservation.starts_at).getTime() - Date.now()) / 3_600_000;
    const totalSlots        = parseInt(reservation.total_slots, 10);
    const reservedSlots     = parseInt(reservation.reserved_slots, 10);
    const occupancyPercent  = totalSlots > 0
      ? Math.min(100, (reservedSlots / totalSlots) * 100)
      : 50;

    const breakdown = this.pricingService.calculate({
      contractPrice,
      distanceKm,
      anticipationHours,
      occupancyPercent,
      vehicleType: (reservation.vehicle_type as any) ?? 'auto',
    });

    return { reservation, finalPrice: breakdown.finalPrice };
  }

  // Busca un código de promoción válido para el evento de la reserva.
  // No incrementa uses_count aquí — eso solo pasa cuando el pago se confirma
  // de verdad (webhook/sync), para no gastar usos de códigos abandonados.
  private async findValidPromo(code: string, eventId: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM promotions
       WHERE code = $1
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR uses_count < max_uses)
         AND (event_id IS NULL OR event_id = $2)`,
      [code.trim().toUpperCase(), eventId],
    );
    if (!rows.length) throw new BadRequestException('Código promocional inválido o ya no disponible');
    return rows[0];
  }

  private applyDiscount(amount: number, promo: { type: string; value: string | number }): number {
    const value = parseFloat(promo.value as string);
    const discounted = promo.type === 'percent'
      ? amount * (1 - value / 100)
      : amount - value;
    return Math.max(0, Math.round(discounted * 100) / 100);
  }

  // Stripe rechaza montos por debajo de este mínimo para MXN — si el
  // descuento deja el total por debajo, el checkout se resuelve sin Stripe.
  private readonly MIN_CHARGE_MXN = 10;

  async createPaymentIntent(reservationId: string, userId: string) {
    const { reservation, finalPrice } = await this.computeReservationPrice(reservationId, userId);

    // 3. Crear Payment Intent en Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(finalPrice * 100),
      currency: 'mxn',
      metadata: {
        reservation_id: reservationId,
        user_id: userId,
        event_name: reservation.event_name,
        vehicle_type: reservation.vehicle_type ?? '',
      },
      description: `Boleto de estacionamiento — ${reservation.event_name}`,
    });

    // 4. Registrar en payments
    await this.dataSource.query(
      `INSERT INTO payments (reservation_id, provider, provider_payment_id, amount, currency, status)
       VALUES ($1, 'stripe', $2, $3, 'MXN', 'pending')
       ON CONFLICT (provider_payment_id) DO NOTHING`,
      [reservationId, paymentIntent.id, finalPrice],
    );

    return {
      clientSecret: paymentIntent.client_secret,
      amount: finalPrice,
      eventName: reservation.event_name,
      vehicleType: reservation.vehicle_type,
    };
  }

  // Valida un código y lo aplica al Payment Intent ya creado para esta
  // reserva — actualiza el mismo intent en vez de crear uno nuevo, para no
  // tener que remontar Stripe Elements con un clientSecret distinto. El
  // monto nunca baja de MIN_CHARGE_MXN (el mínimo cobrable por Stripe en
  // MXN) — un descuento de 100% igual cobra ese mínimo, nunca queda gratis.
  async applyPromoCode(reservationId: string, userId: string, code: string) {
    const { reservation, finalPrice } = await this.computeReservationPrice(reservationId, userId);
    const promo = await this.findValidPromo(code, reservation.event_id);
    const discountedPrice = Math.max(this.MIN_CHARGE_MXN, this.applyDiscount(finalPrice, promo));

    const [payment] = await this.dataSource.query(
      `SELECT * FROM payments WHERE reservation_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [reservationId],
    );
    if (!payment) throw new BadRequestException('No hay un pago pendiente para esta reserva');

    await this.stripe.paymentIntents.update(payment.provider_payment_id, {
      amount: Math.round(discountedPrice * 100),
    });
    await this.dataSource.query(
      `UPDATE payments SET amount = $1, promo_code = $2 WHERE id = $3`,
      [discountedPrice, promo.code, payment.id],
    );

    return { amount: discountedPrice, code: promo.code };
  }

  // Llamado desde el webhook y desde syncPaymentIntent cuando un pago (con
  // código aplicado) se confirma de verdad — recién ahí se gasta el uso.
  async incrementPromoUseByCode(code: string | null | undefined): Promise<void> {
    if (!code) return;
    await this.dataSource.query(
      `UPDATE promotions SET uses_count = uses_count + 1
       WHERE code = $1 AND (max_uses IS NULL OR uses_count < max_uses)`,
      [code],
    );
  }

  async getReservationPayment(reservationId: string) {
    const result = await this.dataSource.query(
      `SELECT * FROM payments WHERE reservation_id = $1`,
      [reservationId],
    );
    return result[0] || null;
  }

  async getCurrentVehicle(reservationId: string, userId: string) {
    const rows = await this.dataSource.query(
      `SELECT r.status, r.vehicle_type, r.vehicle_plate, r.vehicle_make, r.vehicle_model,
              r.vehicle_version, r.vehicle_year, r.vehicle_color,
              e.starts_at, q.scanned_at
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN qr_tokens q ON q.reservation_id = r.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [reservationId, userId],
    );
    if (!rows.length) throw new NotFoundException('Reserva no encontrada');
    const r = rows[0];

    const eligible = r.status === 'paid' && !r.scanned_at && new Date(r.starts_at) > new Date();

    return {
      eligible,
      reason: r.status !== 'paid'
        ? 'Solo se puede cambiar el vehículo de un boleto ya pagado'
        : r.scanned_at
        ? 'No se puede cambiar el vehículo después de haber ingresado al evento'
        : new Date(r.starts_at) <= new Date()
        ? 'El evento ya comenzó'
        : null,
      vehicleType: r.vehicle_type,
      plate: r.vehicle_plate,
      make: r.vehicle_make,
      model: r.vehicle_model,
      version: r.vehicle_version,
      year: r.vehicle_year,
      color: r.vehicle_color,
    };
  }

  // ─── Cambio de vehículo post-compra ────────────────────────────────────────
  // El usuario puede cambiar el vehículo asociado a un boleto ya pagado. Si el
  // nuevo vehículo cae en una categoría más cara, debe pagar la diferencia
  // antes de que el cambio se aplique (ver vehicle_change_payments + webhook).

  private async computeVehicleChangeQuote(reservationId: string, userId: string, dto: VehicleChangeDto) {
    const clasif = this.vehiculos.resolverVehiculo(dto.make, dto.model, dto.version);
    if (!clasif.ok) throw new BadRequestException(clasif.error);
    const toVehicleType = clasif.categoria!;

    const rows = await this.dataSource.query(
      `SELECT r.id, r.status, r.vehicle_type,
              COALESCE(r.parking_id, e.parking_id) AS parking_id,
              e.starts_at,
              e.price    AS event_base_price,
              e.venue_id,
              sp.price   AS contract_price,
              COALESCE(vp.distance_meters, 500) AS distance_meters,
              COALESCE(sp.slots, 0)             AS total_slots,
              (SELECT COUNT(*) FROM reservations r2
               WHERE r2.parking_id = COALESCE(r.parking_id, e.parking_id)
                 AND r2.event_id   = r.event_id
                 AND r2.status NOT IN ('cancelled','expired')
              )::int                            AS reserved_slots,
              q.scanned_at,
              (
                COALESCE((SELECT SUM(amount) FROM payments WHERE reservation_id = r.id AND status = 'completed'), 0) +
                COALESCE((SELECT SUM(amount) FROM vehicle_change_payments WHERE reservation_id = r.id AND status = 'completed'), 0)
              ) AS amount_paid
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN qr_tokens q ON q.reservation_id = r.id
       LEFT JOIN parking_slots_pricing sp
              ON sp.parking_id   = COALESCE(r.parking_id, e.parking_id)
             AND sp.vehicle_type = $3
       LEFT JOIN venue_parkings vp
              ON vp.parking_id = COALESCE(r.parking_id, e.parking_id)
             AND vp.venue_id   = e.venue_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [reservationId, userId, toVehicleType],
    );

    if (!rows.length) throw new NotFoundException('Reserva no encontrada');
    const r = rows[0];

    if (r.status !== 'paid') throw new BadRequestException('Solo se puede cambiar el vehículo de un boleto ya pagado');
    if (r.scanned_at) throw new BadRequestException('No se puede cambiar el vehículo después de haber ingresado al evento');
    if (new Date(r.starts_at) < new Date()) throw new BadRequestException('El evento ya comenzó');

    const contractPrice = r.contract_price
      ? parseFloat(r.contract_price)
      : parseFloat(r.event_base_price);

    const distanceKm        = parseFloat(r.distance_meters) / 1000;
    const anticipationHours = (new Date(r.starts_at).getTime() - Date.now()) / 3_600_000;
    const totalSlots        = parseInt(r.total_slots, 10);
    const reservedSlots     = parseInt(r.reserved_slots, 10);
    const occupancyPercent  = totalSlots > 0
      ? Math.min(100, (reservedSlots / totalSlots) * 100)
      : 50;

    const breakdown = this.pricingService.calculate({
      contractPrice, distanceKm, anticipationHours, occupancyPercent,
      vehicleType: toVehicleType,
    });

    const newPrice   = breakdown.finalPrice;
    const amountPaid = parseFloat(r.amount_paid);
    const diff       = Math.round((newPrice - amountPaid) * 100) / 100;

    return {
      fromVehicleType: r.vehicle_type as string,
      toVehicleType,
      amountPaid,
      newPrice,
      diff,
      requiresPayment: diff > 1, // margen de 1 MXN para evitar cargos por redondeo
    };
  }

  async quoteVehicleChange(reservationId: string, userId: string, dto: VehicleChangeDto) {
    return this.computeVehicleChangeQuote(reservationId, userId, dto);
  }

  async createVehicleChangeIntent(reservationId: string, userId: string, dto: VehicleChangeDto) {
    const quote = await this.computeVehicleChangeQuote(reservationId, userId, dto);
    if (!quote.requiresPayment) {
      throw new BadRequestException('Este cambio no requiere pago — usa el endpoint de aplicar directo');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(quote.diff * 100),
      currency: 'mxn',
      metadata: {
        type: 'vehicle_change',
        reservation_id: reservationId,
        user_id: userId,
        to_vehicle_type: quote.toVehicleType,
      },
      description: `Cambio de vehículo (${quote.fromVehicleType} → ${quote.toVehicleType})`,
    });

    await this.dataSource.query(
      `INSERT INTO vehicle_change_payments
         (reservation_id, from_vehicle_type, to_vehicle_type, plate, make, model, version, year, color, amount, provider_payment_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
       ON CONFLICT (provider_payment_id) DO NOTHING`,
      [
        reservationId, quote.fromVehicleType, quote.toVehicleType,
        dto.plate.toUpperCase(), dto.make.trim(), dto.model.trim(), dto.version ?? null,
        dto.year ?? null, dto.color?.trim() ?? null,
        quote.diff, paymentIntent.id,
      ],
    );

    return { clientSecret: paymentIntent.client_secret, diff: quote.diff, toVehicleType: quote.toVehicleType };
  }

  async applyVehicleChangeFree(reservationId: string, userId: string, dto: VehicleChangeDto) {
    const quote = await this.computeVehicleChangeQuote(reservationId, userId, dto);
    if (quote.requiresPayment) {
      throw new BadRequestException('Este cambio requiere pago del extra antes de aplicarse');
    }

    await this.dataSource.query(
      `UPDATE reservations
       SET vehicle_plate   = $1,
           vehicle_make    = $2,
           vehicle_model   = $3,
           vehicle_type    = $4,
           vehicle_year    = $5,
           vehicle_color   = $6,
           vehicle_version = $7
       WHERE id = $8 AND user_id = $9`,
      [
        dto.plate.toUpperCase(), dto.make.trim(), dto.model.trim(), quote.toVehicleType,
        dto.year ?? null, dto.color?.trim() ?? null, dto.version ?? null,
        reservationId, userId,
      ],
    );

    return { ok: true, toVehicleType: quote.toVehicleType };
  }

  // Aplica un cambio de vehículo ya pagado (llamado desde el webhook/sync de Stripe)
  async applyPaidVehicleChange(providerPaymentId: string): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT * FROM vehicle_change_payments WHERE provider_payment_id = $1`,
      [providerPaymentId],
    );
    if (!rows.length || rows[0].status === 'completed') return;
    const vcp = rows[0];

    await this.dataSource.query(
      `UPDATE vehicle_change_payments SET status = 'completed', paid_at = NOW() WHERE id = $1`,
      [vcp.id],
    );

    await this.dataSource.query(
      `UPDATE reservations
       SET vehicle_plate   = $1,
           vehicle_make    = $2,
           vehicle_model   = $3,
           vehicle_type    = $4,
           vehicle_year    = $5,
           vehicle_color   = $6,
           vehicle_version = $7
       WHERE id = $8`,
      [vcp.plate, vcp.make, vcp.model, vcp.to_vehicle_type, vcp.year, vcp.color, vcp.version, vcp.reservation_id],
    );
  }

  // Confirma un PaymentIntent verificando con Stripe — cubre la race condition
  // entre el redirect del browser y la llegada del webhook (o su ausencia en dev).
  async syncPaymentIntent(paymentIntentId: string, userId: string): Promise<void> {
    // Cambio de vehículo: flujo separado, no toca `payments`/QR/reserva "paid"
    const vcp = await this.dataSource.query(
      `SELECT status FROM vehicle_change_payments WHERE provider_payment_id = $1`,
      [paymentIntentId],
    );
    if (vcp.length) {
      if (vcp[0].status === 'completed') return;
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded') return;
      if (intent.metadata.user_id !== userId) throw new ForbiddenException();
      await this.applyPaidVehicleChange(paymentIntentId);
      return;
    }

    // Idempotencia — si ya fue procesado, salir
    const existing = await this.dataSource.query(
      `SELECT status, promo_code FROM payments WHERE provider_payment_id = $1`,
      [paymentIntentId],
    );
    if (existing[0]?.status === 'completed') return;

    // Verificar con Stripe (no confiamos sólo en el parámetro de la URL)
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') return;
    if (intent.metadata.user_id !== userId) throw new ForbiddenException();

    const reservationId = intent.metadata.reservation_id;

    await this.dataSource.query(
      `UPDATE payments SET status = 'completed', paid_at = NOW()
       WHERE provider_payment_id = $1`,
      [paymentIntentId],
    );

    await this.dataSource.query(
      `UPDATE reservations SET status = 'paid' WHERE id = $1`,
      [reservationId],
    );

    await this.incrementPromoUseByCode(existing[0]?.promo_code);

    const qrToken = await this.qrService.generateQR(reservationId);

    // Fire-and-forget igual que el webhook — no bloquea la respuesta al cliente
    this.notificationsService.sendTicket(reservationId, qrToken).catch(e =>
      console.error('Notification error (sync):', e?.message),
    );
  }
}
