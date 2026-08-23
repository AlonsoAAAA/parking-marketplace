-- ================================================================
-- 013_whatsapp_messages.sql — Tracking de envíos/entregas de WhatsApp
-- ================================================================
-- Idempotente. Ejecutar después de 001–012.

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id  VARCHAR(100),                  -- wamid devuelto por la Graph API
  phone          VARCHAR(20)  NOT NULL,
  template_name  VARCHAR(100),                  -- null si fue texto libre
  purpose        VARCHAR(30)  NOT NULL,          -- otp | ticket | welcome | reminder_24h | reminder_3h
  status         VARCHAR(20)  NOT NULL DEFAULT 'sent',  -- sent | delivered | read | failed
  error_detail   JSONB,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_message_id ON whatsapp_messages (wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_reservation_id ON whatsapp_messages (reservation_id);
