-- ================================================================
-- 007_pricing_config.sql — Motor de precios dinámicos
-- ================================================================
-- Idempotente. Ejecutar después de 001–006.

CREATE TABLE IF NOT EXISTS pricing_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  margin_min          DECIMAL(5,2)  NOT NULL DEFAULT 15.00,   -- % mínimo de margen
  margin_max          DECIMAL(5,2)  NOT NULL DEFAULT 60.00,   -- % máximo de margen
  weight_distance     DECIMAL(5,4)  NOT NULL DEFAULT 0.4000,  -- peso multiplicador distancia
  weight_anticipation DECIMAL(5,4)  NOT NULL DEFAULT 0.3500,  -- peso multiplicador anticipación
  weight_demand       DECIMAL(5,4)  NOT NULL DEFAULT 0.2500,  -- peso multiplicador demanda
  updated_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Fila única de configuración (seed inicial)
INSERT INTO pricing_config (margin_min, margin_max, weight_distance, weight_anticipation, weight_demand)
SELECT 15.00, 60.00, 0.4000, 0.3500, 0.2500
WHERE NOT EXISTS (SELECT 1 FROM pricing_config);
