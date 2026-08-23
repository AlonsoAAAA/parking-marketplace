import { Controller, Post, Req, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as Twilio from 'twilio';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private config: ConfigService,
    private whatsapp: WhatsAppService,
  ) {}

  // Twilio manda tanto status callbacks (queued/sent/delivered/read/failed)
  // como mensajes entrantes a esta misma URL, con formas de payload distintas
  // — a diferencia de Meta, no hay un paso separado de verificación por GET.
  @Post('webhook')
  async receive(@Req() req: Request) {
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const signature = req.headers['x-twilio-signature'] as string;
    const url = `${this.config.get('PUBLIC_API_URL')}/api/v1/whatsapp/webhook`;

    const valid = authToken && signature && Twilio.validateRequest(authToken, signature, url, req.body as any);
    if (!valid) {
      throw new BadRequestException('Firma de webhook inválida');
    }

    // Responder rápido; Twilio reintenta si no hay respuesta pronto.
    this.processEvent(req.body).catch((e) => console.error('❌ Twilio webhook error:', e?.message));

    return { received: true };
  }

  private async processEvent(body: any): Promise<void> {
    // Status callback de un mensaje saliente.
    if (body?.MessageStatus && body?.MessageSid) {
      await this.whatsapp.markDelivered(body.MessageSid, body.MessageStatus);
      return;
    }

    // Mensaje entrante — Fase 1: solo se loguea. El ruteo a un motor de
    // conversación (compra por chat) queda para una fase separada.
    if (body?.From) {
      console.log(`📩 Mensaje entrante de ${body.From}: ${body.Body ?? '[sin texto]'}`);
    }
  }
}
