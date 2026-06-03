import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';
import { QrService } from '../qr/qr.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
    private qrService: QrService,
    private notificationsService: NotificationsService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(reservationId: string, userId: string) {
    // 1. Obtener reserva con precios por categoría del evento
    const result = await this.dataSource.query(
      `SELECT r.id, r.status, r.expires_at, r.vehicle_type,
              e.price, e.price_auto, e.price_sub, e.price_pickup, e.price_moto,
              e.name as event_name
       FROM reservations r
       JOIN events e ON e.id = r.event_id
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

    // 2. Seleccionar precio según tipo de vehículo
    const priceByType: Record<string, string | null> = {
      'Auto':    reservation.price_auto,
      'Sub':     reservation.price_sub,
      'Pick Up': reservation.price_pickup,
      'Moto':    reservation.price_moto,
    };
    const categoryPrice = reservation.vehicle_type ? priceByType[reservation.vehicle_type] : null;
    const finalPrice = parseFloat(categoryPrice ?? reservation.price);

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
