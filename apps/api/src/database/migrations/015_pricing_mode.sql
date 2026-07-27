-- ================================================================
-- 015_pricing_mode.sql — Modo de precio: fijo vs. dinámico
-- ================================================================
-- Idempotente. Ejecutar después de 001–014.
--
-- Por ahora el negocio quiere precio FIJO (margen único, sin variar por
-- distancia/anticipación/demanda). Se deja el motor dinámico intacto para
-- poder activarlo después sin más migraciones.

ALTER TABLE pricing_config
  ADD COLUMN IF NOT EXISTS mode              VARCHAR(10)   NOT NULL DEFAULT 'fixed'
    CHECK (mode IN ('fixed', 'dynamic')),
  ADD COLUMN IF NOT EXISTS fixed_margin_pct  DECIMAL(5,2)  NOT NULL DEFAULT 30.00;
