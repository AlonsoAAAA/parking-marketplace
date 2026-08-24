-- ================================================================
-- 024_payments_promo_code.sql — Registrar código promocional aplicado
-- ================================================================
-- Idempotente. Ejecutar después de 001–023.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);
