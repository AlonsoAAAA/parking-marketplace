import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class NotificationsService {
  constructor(
    private config: ConfigService,
    private whatsapp: WhatsAppService,
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

    if (data.phone) {
      await this.sendWhatsAppTicket(data);
    }
  }

  private async sendWhatsAppTicket(data: any): Promise<void> {
    const fecha = new Date(data.starts_at).toLocaleString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Mexico_City',
    });

    const marketplaceUrl = this.config.get('MARKETPLACE_URL') ?? 'https://estacionat.mx';
    const publicApiUrl = this.config.get('PUBLIC_API_URL');
    const venueOrParking = data.venue_name || data.parking_name;
    const ticketUrl = `${marketplaceUrl}/mis-boletos/${data.id}`;
    const qrImageUrl = `${publicApiUrl}/api/v1/qr/${data.id}/image`;

    const caption = [
      `✅ *¡Tu lugar está confirmado!*`,
      ``,
      `🎉 *${data.event_name}*`,
      `📍 ${venueOrParking}`,
      data.parking_address ? `🏠 ${data.parking_address}` : null,
      `📅 ${fecha}`,
      ``,
      `📲 Ver tu boleto completo:`,
      ticketUrl,
      ``,
      `⚠️ *Política de cancelación:* reembolso escalonado según anticipación (100% con +48h, 70% entre 36-48h, 50% entre 24-36h), desde "Mis boletos". Sin reembolso dentro de las 24 horas previas al evento.`,
      ``,
      `📄 Términos y condiciones: ${marketplaceUrl}/terminos`,
    ].filter(Boolean).join('\n');

    await this.whatsapp.send(data.phone, 'ticket', caption, {
      contentSid: this.config.get('TWILIO_TICKET_CONTENT_SID'),
      contentVariables: {
        '1': data.event_name,
        '2': venueOrParking,
        '3': fecha,
        '4': ticketUrl,
      },
      // Sin PUBLIC_API_URL (ej. dev local sin túnel) no hay forma de que
      // Twilio descargue la imagen — cae a solo texto con el link del boleto.
      mediaUrl: publicApiUrl ? qrImageUrl : undefined,
      reservationId: data.id,
    });
  }
}
