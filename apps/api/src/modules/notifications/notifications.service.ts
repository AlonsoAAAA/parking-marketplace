import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QrService } from '../qr/qr.service';

@Injectable()
export class NotificationsService {
  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
    private qrService: QrService,
  ) {}

  async sendTicket(reservationId: string, token: string): Promise<void> {
    // Obtener datos completos de la reserva
    const result = await this.dataSource.query(
      `SELECT r.*, u.phone, u.name as user_name, u.email,
              e.name as event_name, e.starts_at, e.venue_name,
              p.name as parking_name, p.address as parking_address
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       JOIN events e ON e.id = r.event_id
       JOIN parkings p ON p.id = e.parking_id
       WHERE r.id = $1`,
      [reservationId],
    );

    if (!result.length) return;

    const data = result[0];

    // Generar imagen QR
    const qrImage = await this.qrService.generateQRImage(token);

    // Enviar por WhatsApp
    if (data.phone) {
      await this.sendWhatsAppTicket(data, qrImage);
    }
  }

  private async sendWhatsAppTicket(data: any, qrImageBase64: string): Promise<void> {
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

    const message = [
      `✅ *¡Tu lugar está confirmado!*`,
      ``,
      `🎉 *${data.event_name}*`,
      `📍 ${data.venue_name || data.parking_name}`,
      `🏠 ${data.parking_address}`,
      `📅 ${fecha}`,
      ``,
      `Tu código QR está adjunto. Preséntalo al llegar — solo es válido una vez.`,
    ].join('\n');

    const twilio = require('twilio')(accountSid, authToken);

    // Usar número tal como está almacenado (formato E.164 sin '+': 52XXXXXXXXXX)
    const waPhone = data.phone as string;

    // Construir payload — agregar mediaUrl si hay URL pública del QR
    const publicUrl = this.config.get('PUBLIC_API_URL'); // e.g. ngrok URL
    const payload: any = {
      body: message,
      from: fromNumber,
      to: `whatsapp:+${waPhone}`,
    };

    if (publicUrl && data.id) {
      payload.mediaUrl = [`${publicUrl}/api/v1/qr/${data.id}/image`];
    }

    try {
      const sent = await twilio.messages.create(payload);
      console.log(`✅ WhatsApp enviado a +${data.phone} — SID: ${sent.sid}`);
    } catch (e: any) {
      console.error(`❌ WhatsApp error para +${data.phone}:`, e?.message);
    }
  }
}
