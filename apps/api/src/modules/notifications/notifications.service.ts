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

    if (data.phone) {
      await this.sendWhatsAppTicket(data);
      await this.sendSmsTicket(data);
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
      `🎟️ Ver y descargar tu código QR:`,
      `${marketplaceUrl}/mis-boletos/${data.id}`,
      ``,
      `⚠️ *Política de cancelaciones:* reembolso escalonado según anticipación (100% con +48h, 70% entre 36-48h, 50% entre 24-36h). Sin reembolso dentro de las 24 horas previas al evento.`,
      ``,
      `📄 Términos y condiciones: https://www.estacionat.mx/terminos`,
    ].join('\n');

    const twilio = require('twilio')(accountSid, authToken);

    // Usar número tal como está almacenado (formato E.164 sin '+': 52XXXXXXXXXX)
    const waPhone = data.phone as string;

    // Plantilla aprobada por Meta (producción). Sin SID → texto libre (solo sandbox).
    const templateSid = this.config.get('TWILIO_TICKET_TEMPLATE_SID');

    const payload: any = { from: fromNumber, to: `whatsapp:+${waPhone}` };
    if (templateSid) {
      payload.contentSid = templateSid;
      payload.contentVariables = JSON.stringify({
        '1': data.event_name,
        '2': data.venue_name || data.parking_name,
        '3': fecha,
        '4': `${marketplaceUrl}/mis-boletos/${data.id}`,
      });
    } else {
      payload.body = message;
    }


    try {
      const sent = await twilio.messages.create(payload);
      console.log(`✅ WhatsApp enviado a +${data.phone} — SID: ${sent.sid}`);
    } catch (e: any) {
      console.error(`❌ WhatsApp error para +${data.phone}:`, e?.message);
    }
  }

  private async sendSmsTicket(data: any): Promise<void> {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken  = this.config.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get('TWILIO_SMS_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.log(`📱 [SMS desactivado] Boleto para +${data.phone} — ${data.event_name}`);
      return;
    }

    const fecha = new Date(data.starts_at).toLocaleString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const marketplaceUrl = this.config.get('MARKETPLACE_URL') ?? 'https://estacionat.mx';
    const ticketUrl = `${marketplaceUrl}/mis-boletos/${data.id}`;

    const message = [
      `Tu lugar en ${data.event_name} esta confirmado.`,
      `${data.venue_name || data.parking_name} — ${fecha}`,
      `Tu boleto con QR: ${ticketUrl}`,
    ].join('\n');

    // El teléfono se guarda en formato WhatsApp (521XXXXXXXXXX, 13 dígitos) —
    // SMS usa el E.164 estándar (52XXXXXXXXXX, 12 dígitos, sin el '1' extra).
    const digits = (data.phone as string).replace(/\D/g, '');
    const smsPhone = digits.length === 13 && digits.startsWith('521')
      ? `52${digits.slice(3)}`
      : digits;

    const twilio = require('twilio')(accountSid, authToken);

    try {
      const sent = await twilio.messages.create({
        from: fromNumber,
        to: `+${smsPhone}`,
        body: message,
      });
      console.log(`✅ SMS de boleto enviado a +${smsPhone} — SID: ${sent.sid}`);
    } catch (e: any) {
      console.error(`❌ SMS error para +${smsPhone}:`, e?.message);
    }
  }
}
