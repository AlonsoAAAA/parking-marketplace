import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';
import { QrService } from '../qr/qr.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FraudService } from '../fraud/fraud.service';

@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
    private qrService: QrService,
    private notificationsService: NotificationsService,
    private fraud: FraudService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  @Post('stripe')
  async stripeWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') sig: string,
  ) {
    // 1. Verificar firma — NUNCA omitir
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        this.config.get('STRIPE_WEBHOOK_SECRET'),
      );
    } catch {
      throw new BadRequestException('Firma de webhook inválida');
    }

    // 2. Manejar pagos fallidos
    if (event.type === 'payment_intent.payment_failed') {
      const failedIntent = event.data.object as Stripe.PaymentIntent;
      await this.dataSource.query(
        `UPDATE payments SET status = 'failed' WHERE provider_payment_id = $1`,
        [failedIntent.id],
      );
      const reservation = await this.dataSource.query(
        `SELECT r.user_id FROM payments p
         JOIN reservations r ON r.id = p.reservation_id
         WHERE p.provider_payment_id = $1`,
        [failedIntent.id],
      );
      if (reservation[0]?.user_id) {
        this.fraud.checkFailedPayments(reservation[0].user_id).catch(() => {});
      }
      return { received: true };
    }

    // 3. Solo procesar pagos completados
    if (event.type !== 'payment_intent.succeeded') {
      return { received: true };
    }

    const intent = event.data.object as Stripe.PaymentIntent;
    const reservationId = intent.metadata.reservation_id;

    // 3. Idempotencia — no procesar dos veces
    const payment = await this.dataSource.query(
      `SELECT status FROM payments WHERE provider_payment_id = $1`,
      [intent.id],
    );

    if (payment[0]?.status === 'completed') {
      console.log(`⚠️ Webhook duplicado ignorado: ${intent.id}`);
      return { received: true };
    }

    // 4. Actualizar payment con payload crudo
    await this.dataSource.query(
      `UPDATE payments
       SET status = 'completed', paid_at = NOW(), raw_webhook = $1
       WHERE provider_payment_id = $2`,
      [JSON.stringify(event), intent.id],
    );

    // 5. Actualizar reserva a pagada
    await this.dataSource.query(
      `UPDATE reservations SET status = 'paid' WHERE id = $1`,
      [reservationId],
    );

    // 6. Generar QR
    const token = await this.qrService.generateQR(reservationId);

    // 7. Notificar — fire-and-forget so QR is immediately visible in DB
    this.notificationsService.sendTicket(reservationId, token).catch(e =>
      console.error('Notification error:', e?.message),
    );

    console.log(`✅ Pago confirmado y QR generado para reserva: ${reservationId}`);

    return { received: true };
  }
}
