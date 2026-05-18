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
    const isDev = this.config.get('NODE_ENV') === 'development';

    if (isDev) {
      console.log(`📱 Boleto enviado a WhatsApp +${data.phone}`);
      console.log(`   Evento: ${data.event_name}`);
      console.log(`   Venue: ${data.venue_name}`);
      console.log(`   Fecha: ${new Date(data.starts_at).toLocaleString('es-MX')}`);
      return;
    }

    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get('TWILIO_WHATSAPP_NUMBER');

    const twilio = require('twilio')(accountSid, authToken);

    const message = [
      `✅ *¡Tu lugar está confirmado!*`,
      ``,
      `🎉 *${data.event_name}*`,
      `📍 ${data.venue_name || data.parking_name}`,
      `🏠 ${data.parking_address}`,
      `📅 ${new Date(data.starts_at).toLocaleString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      ``,
      `Presenta este código QR al llegar. Solo es válido una vez.`,
    ].join('\n');

    await twilio.messages.create({
      body: message,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:+${data.phone}`,
      // En producción aquí iría la URL pública de la imagen QR
      // mediaUrl: [`https://tu-dominio.com/api/v1/qr/${data.id}/image`],
    });
  }
}
