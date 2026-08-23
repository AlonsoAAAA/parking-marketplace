-- ================================================================
-- 014_reservation_reminders.sql — Tracking de recordatorios enviados
-- ================================================================
-- Idempotente. Ejecutar después de 001–013.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reminder_3h_sent_at  TIMESTAMP;
