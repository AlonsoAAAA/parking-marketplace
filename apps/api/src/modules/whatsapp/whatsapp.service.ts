import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as Twilio from 'twilio';
import { normalizePhone } from '../../lib/phone';

export type WhatsAppPurpose = 'otp' | 'ticket' | 'welcome' | 'reminder_24h' | 'reminder_3h';
type Channel = 'whatsapp' | 'sms';

export interface SendOptions {
  // SID de un Content Template de Twilio ya aprobado (Content Template Builder).
  // Sin esto, WhatsApp manda `fallbackText` como texto libre (solo válido dentro
  // de la ventana de 24h de conversación abierta).
  contentSid?: string;
  contentVariables?: Record<string, string>;
  mediaUrl?: string;
  reservationId?: string;
}

@Injectable()
export class WhatsAppService {
  private client: Twilio.Twilio | null = null;

  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  private get twilio(): Twilio.Twilio | null {
    const sid = this.config.get('TWILIO_ACCOUNT_SID');
    const token = this.config.get('TWILIO_AUTH_TOKEN');
    if (!sid || !token) return null;
    if (!this.client) this.client = Twilio(sid, token);
    return this.client;
  }

  // Dirección WhatsApp: Twilio exige el formato legacy mexicano 521XXXXXXXXXX
  // (con el '1' extra) — a diferencia de la Graph API directa de Meta.
  private toWhatsAppAddress(phone: string): string {
    return `whatsapp:+${normalizePhone(phone)}`;
  }

  // Dirección SMS/voz real: el '1' de WhatsApp no es parte del número real,
  // hay que quitarlo para SMS.
  private toSmsAddress(phone: string): string {
    const d = normalizePhone(phone);
    const e164 = d.length === 13 && d.startsWith('521') ? `52${d.slice(3)}` : d;
    return `+${e164}`;
  }

  // Intenta WhatsApp primero; si falla por cualquier motivo, cae a SMS
  // automáticamente. `fallbackText` se usa como cuerpo del SMS siempre, y
  // como cuerpo de WhatsApp si no hay `contentSid` (template aprobado).
  async send(
    phone: string,
    purpose: WhatsAppPurpose,
    fallbackText: string,
    options: SendOptions = {},
  ): Promise<boolean> {
    const waSent = await this.sendVia('whatsapp', phone, purpose, fallbackText, options);
    if (waSent) return true;

    return this.sendVia('sms', phone, purpose, fallbackText, options);
  }

  private async sendVia(
    channel: Channel,
    phone: string,
    purpose: WhatsAppPurpose,
    fallbackText: string,
    options: SendOptions,
    isRetry = false,
  ): Promise<boolean> {
    const client = this.twilio;
    const fromNumber =
      channel === 'whatsapp'
        ? this.config.get('TWILIO_WHATSAPP_NUMBER')
        : this.config.get('TWILIO_SMS_NUMBER');

    if (!client || !fromNumber) {
      console.log(`📱 [${channel} desactivado] ${purpose} para ${phone}`);
      return false;
    }

    const to = channel === 'whatsapp' ? this.toWhatsAppAddress(phone) : this.toSmsAddress(phone);
    const payload: Record<string, any> = { from: fromNumber, to };

    const publicApiUrl = this.config.get('PUBLIC_API_URL');
    if (publicApiUrl) {
      payload.statusCallback = `${publicApiUrl}/api/v1/whatsapp/webhook`;
    }

    // El SID de Content Template solo aplica a WhatsApp — SMS no tiene
    // concepto de "template aprobado", siempre es texto libre.
    if (channel === 'whatsapp' && options.contentSid) {
      payload.contentSid = options.contentSid;
      if (options.contentVariables) {
        payload.contentVariables = JSON.stringify(options.contentVariables);
      }
    } else {
      payload.body = fallbackText;
    }

    if (options.mediaUrl) {
      payload.mediaUrl = [options.mediaUrl];
    }

    try {
      const sent = await client.messages.create(payload as any);
      console.log(`✅ ${channel} enviado a ${to} — SID: ${sent.sid}`);
      await this.logMessage(channel, phone, options.contentSid ?? null, purpose, 'sent', null, sent.sid, options.reservationId, fallbackText);
      return true;
    } catch (e: any) {
      // Errores transitorios (de red, o 5xx de Twilio): un solo reintento
      // inmediato, sin backoff/colas. 4xx (número inválido, sender no
      // aprobado, etc.) es permanente — no tiene caso reintentar.
      const transient = e?.status === undefined || e.status >= 500;
      if (!isRetry && transient) {
        return this.sendVia(channel, phone, purpose, fallbackText, options, true);
      }
      console.error(`❌ ${channel} error para ${to}: ${e?.message} (código: ${e?.code})`);
      await this.logMessage(
        channel,
        phone,
        options.contentSid ?? null,
        purpose,
        'failed',
        { message: e?.message, code: e?.code },
        null,
        options.reservationId,
        fallbackText,
      );
      return false;
    }
  }

  // Twilio confirma el envío de WhatsApp de forma síncrona (HTTP 201, "aceptado
  // para procesar") pero el resultado real (delivered/undelivered) llega después
  // por este webhook. Si termina en falla, ahí — y solo ahí — se sabe con certeza
  // que WhatsApp no lo entregó, así que es aquí donde se reintenta por SMS.
  async handleStatusCallback(messageSid: string, status: string): Promise<void> {
    // `dataSource.query` en UPDATE...RETURNING devuelve [filas[], contador],
    // no las filas directamente como en un SELECT — a diferencia de otras
    // consultas en este archivo, aquí sí importa desempacar bien el resultado.
    const [rows] = await this.dataSource.query(
      `UPDATE whatsapp_messages
       SET status = $1, updated_at = NOW()
       WHERE wa_message_id = $2
       RETURNING phone, purpose, reservation_id, fallback_text, channel, sms_fallback_sent`,
      [status, messageSid],
    );
    const msg = rows?.[0];
    if (!msg) return;

    const isFailure = status === 'failed' || status === 'undelivered';
    if (!isFailure || msg.channel !== 'whatsapp' || !msg.fallback_text || msg.sms_fallback_sent) return;

    await this.dataSource.query(
      `UPDATE whatsapp_messages SET sms_fallback_sent = true WHERE wa_message_id = $1`,
      [messageSid],
    );
    console.log(`↩️ WhatsApp falló (${status}) para ${msg.phone}, reintentando por SMS`);
    await this.sendVia('sms', msg.phone, msg.purpose, msg.fallback_text, {
      reservationId: msg.reservation_id ?? undefined,
    });
  }

  private async logMessage(
    channel: Channel,
    phone: string,
    templateName: string | null,
    purpose: WhatsAppPurpose,
    status: 'sent' | 'failed',
    errorDetail: any,
    messageSid: string | null,
    reservationId: string | undefined,
    fallbackText: string,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO whatsapp_messages (wa_message_id, phone, template_name, purpose, status, error_detail, reservation_id, channel, fallback_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          messageSid,
          phone,
          templateName,
          purpose,
          status,
          errorDetail ? JSON.stringify(errorDetail) : null,
          reservationId ?? null,
          channel,
          fallbackText,
        ],
      );
    } catch (e: any) {
      console.error('❌ No se pudo registrar whatsapp_messages:', e?.message);
    }
  }
}
