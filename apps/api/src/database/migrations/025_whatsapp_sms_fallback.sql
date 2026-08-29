-- ================================================================
-- 025_whatsapp_sms_fallback.sql — Reintento a SMS cuando WhatsApp
-- falla de forma asíncrona (fuera de la ventana de 24h, error 63016)
-- ================================================================
-- Idempotente. Ejecutar después de 001–024.
--
-- Twilio acepta el envío de WhatsApp de forma síncrona (HTTP 201) aunque
-- el mensaje termine sin poder entregarse — el resultado real llega después
-- vía webhook de status. Para reintentar por SMS en ese caso hace falta
-- guardar el texto de respaldo aquí, y marcar si ya se reintentó (evita
-- reintentos duplicados si Twilio reenvía el mismo callback de status).

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS fallback_text TEXT,
  ADD COLUMN IF NOT EXISTS sms_fallback_sent BOOLEAN NOT NULL DEFAULT false;
