import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class NotificationsService {
  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async sendTicket(reservationId: string, _token?: string): Promise<void> {
    // Obtener datos completos de la reserva
    const result = await this.dataSource.query(
      `SELECT r.*, u.phone, u.name as user_name, u.email,
              e.name as event_name, e.starts_at, e.venue_name,
              p.name as parking_name, p.address as parking_address
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       JOIN events e ON e.id = r.event_id
       LEFT JOIN parkings p ON p.id = COALESCE(r.parking_id, e.parking_id)
       WHERE r.id = $1`,
      [reservationId],
    );

    if (!result.length) return;

    const data = result[0];

    // Enviar por WhatsApp
    if (data.phone) {
      await this.sendWhatsAppTicket(data);
    }
  }

  private async sendWhatsAppTicket(data: any): Promise<void> {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken  = this.config.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get('TWILIO_WHATSAPP_NUMBER'); // ya incluye 'whatsapp:+...'

    if (!accountSid || !authToken || !fromNumber) {
      console.log(`📱 [WhatsApp desactivado] Boleto para +${data.phone} — ${data.event_name}`);
      return;
    }

    const fecha = new Date(data.starts_at).toLocaleString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const marketplaceUrl = this.config.get('MARKETPLACE_URL') ?? 'https://estacionat.mx';

    const message = [
      `✅ *¡Tu lugar está confirmado!*`,
      ``,
      `🎉 *${data.event_name}*`,
      `📍 ${data.venue_name || data.parking_name}`,
      `🏠 ${data.parking_address}`,
      `📅 ${fecha}`,
      ``,
      `🎟️ Tu código QR está listo. Ábrelo aquí:`,
      `${marketplaceUrl}/checkout/${data.id}/ticket`,
      ``,
      `⚠️ *Política de cancelaciones:* NO SE ACEPTAN CANCELACIONES NI DEVOLUCIONES DENTRO DE LAS 6 HORAS PREVIAS AL INICIO DEL EVENTO. Transcurrido dicho plazo, el pago es definitivo e irrevocable.`,
      ``,
      `📄 Términos y condiciones: https://www.estacionat.mx/terminos`,
    ].join('\n');

    const twilio = require('twilio')(accountSid, authToken);

    // Usar número tal como está almacenado (formato E.164 sin '+': 52XXXXXXXXXX)
    const waPhone = data.phone as string;

    const payload: any = {
      body: message,
      from: fromNumber,
      to: `whatsapp:+${waPhone}`,
    };

    try {
      const sent = await twilio.messages.create(payload);
      console.log(`✅ WhatsApp enviado a +${data.phone} — SID: ${sent.sid}`);
    } catch (e: any) {
      console.error(`❌ WhatsApp error para +${data.phone}:`, e?.message);
    }
  }
}
