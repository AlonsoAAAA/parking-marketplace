-- ================================================================
-- 015_whatsapp_messages_channel.sql — Distinguir WhatsApp vs SMS
-- ================================================================
-- Idempotente. Ejecutar después de 001–014.
-- Soporte de fallback automático WhatsApp → SMS (migración a Twilio).

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS channel VARCHAR(10) NOT NULL DEFAULT 'whatsapp';
