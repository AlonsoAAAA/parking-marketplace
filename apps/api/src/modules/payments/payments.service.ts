import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';
import { QrService } from '../qr/qr.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
    private qrService: QrService,
    private notificationsService: NotificationsService,
    private pricingService: PricingService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(reservationId: string, userId: string) {
    // 1. Obtener reserva con toda la info necesaria para el precio dinámico
    const result = await this.dataSource.query(
      `SELECT r.id, r.status, r.expires_at, r.vehicle_type,
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

    // 2. Calcular precio final con motor de precios dinámicos
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

    const finalPrice = breakdown.finalPrice;

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

  async getReservationPayment(reservationId: string) {
    const result = await this.dataSource.query(
      `SELECT * FROM payments WHERE reservation_id = $1`,
      [reservationId],
    );
    return result[0] || null;
  }

  // Confirma un PaymentIntent verificando con Stripe — cubre la race condition
  // entre el redirect del browser y la llegada del webhook (o su ausencia en dev).
  async syncPaymentIntent(paymentIntentId: string, userId: string): Promise<void> {
    // Idempotencia — si ya fue procesado, salir
    const existing = await this.dataSource.query(
      `SELECT status FROM payments WHERE provider_payment_id = $1`,
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

    const qrToken = await this.qrService.generateQR(reservationId);

    // Fire-and-forget igual que el webhook — no bloquea la respuesta al cliente
    this.notificationsService.sendTicket(reservationId, qrToken).catch(e =>
      console.error('Notification error (sync):', e?.message),
    );
  }
}
