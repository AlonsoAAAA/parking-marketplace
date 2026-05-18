import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(reservationId: string, userId: string) {
    // 1. Obtener reserva con precio del evento
    const result = await this.dataSource.query(
      `SELECT r.id, r.status, r.expires_at, e.price, e.name as event_name,
              u.phone, u.name as user_name
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       JOIN users u ON u.id = r.user_id
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

    // 2. Crear Payment Intent en Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(reservation.price * 100), // Stripe trabaja en centavos
      currency: 'mxn',
      metadata: {
        reservation_id: reservationId,
        user_id: userId,
        event_name: reservation.event_name,
      },
      description: `Boleto de estacionamiento — ${reservation.event_name}`,
    });

    // 3. Registrar en payments
    await this.dataSource.query(
      `INSERT INTO payments (reservation_id, provider, provider_payment_id, amount, currency, status)
       VALUES ($1, 'stripe', $2, $3, 'MXN', 'pending')
       ON CONFLICT (provider_payment_id) DO NOTHING`,
      [reservationId, paymentIntent.id, reservation.price],
    );

    return {
      clientSecret: paymentIntent.client_secret,
      amount: reservation.price,
      eventName: reservation.event_name,
    };
  }

  async getReservationPayment(reservationId: string) {
    const result = await this.dataSource.query(
      `SELECT * FROM payments WHERE reservation_id = $1`,
      [reservationId],
    );
    return result[0] || null;
  }
}
