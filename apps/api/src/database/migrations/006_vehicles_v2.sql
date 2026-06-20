-- ================================================================
-- 006_vehicles_v2.sql — Sistema de vehículos v2
-- ================================================================
-- Ejecutar DESPUÉS de 001–005.
-- Idempotente: usa IF NOT EXISTS / IF EXISTS / DO$$ en todo.

-- ── 1. Campos nuevos en reservations ────────────────────────────────────────
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vehicle_plate   VARCHAR(20);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vehicle_make    VARCHAR(100);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vehicle_model   VARCHAR(100);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vehicle_type    VARCHAR(30);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vehicle_year    INT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vehicle_color   VARCHAR(50);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vehicle_version VARCHAR(100);

-- ── 2. Campos de precio por categoría en events (si no existen ya) ──────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_auto   DECIMAL(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_sub    DECIMAL(10,2);  -- = precio SUV/Camioneta
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_pickup DECIMAL(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_moto   DECIMAL(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS category     VARCHAR(50);

-- ── 3. Asegurar que parking_slots_pricing existe (para entornos frescos) ─────
CREATE TABLE IF NOT EXISTS parking_slots_pricing (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id   UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(30) NOT NULL
                 CHECK (vehicle_type IN ('auto', 'suv_camioneta', 'pickup', 'moto')),
  price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  slots        INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_parking_slot_type UNIQUE (parking_id, vehicle_type)
);

-- ── 4. Migrar nombres de categoría en parking_slots_pricing ─────────────────
DO $$
BEGIN
  -- Quitar constraint viejo (si existe con valores anteriores)
  BEGIN
    ALTER TABLE parking_slots_pricing
      DROP CONSTRAINT parking_slots_pricing_vehicle_type_check;
  EXCEPTION WHEN undefined_table THEN NULL;
               WHEN undefined_object THEN NULL;
  END;
END $$;

UPDATE parking_slots_pricing SET vehicle_type = 'auto'          WHERE vehicle_type = 'Auto';
UPDATE parking_slots_pricing SET vehicle_type = 'suv_camioneta'  WHERE vehicle_type = 'Sub';
UPDATE parking_slots_pricing SET vehicle_type = 'pickup'        WHERE vehicle_type = 'Pick Up';
UPDATE parking_slots_pricing SET vehicle_type = 'moto'          WHERE vehicle_type = 'Moto';

DO $$
BEGIN
  ALTER TABLE parking_slots_pricing
    ADD CONSTRAINT parking_slots_pricing_vehicle_type_check
    CHECK (vehicle_type IN ('auto', 'suv_camioneta', 'pickup', 'moto'));
EXCEPTION WHEN duplicate_object THEN NULL;
           WHEN undefined_table  THEN NULL;
END $$;

-- ── 5. Migrar vehicle_type en reservaciones existentes ───────────────────────
UPDATE reservations SET vehicle_type = 'auto'           WHERE vehicle_type = 'Auto';
UPDATE reservations SET vehicle_type = 'suv_camioneta'   WHERE vehicle_type = 'Sub';
UPDATE reservations SET vehicle_type = 'pickup'         WHERE vehicle_type = 'Pick Up';
UPDATE reservations SET vehicle_type = 'moto'           WHERE vehicle_type = 'Moto';

-- ── 6. parking_id en reservations (si no existe) ────────────────────────────
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS parking_id UUID REFERENCES parkings(id) ON DELETE SET NULL;

-- ── 7. Tables needed by events service (venue/parking associations) ──────────
CREATE TABLE IF NOT EXISTS venue_parkings (
  venue_id        UUID NOT NULL REFERENCES venues(id)   ON DELETE CASCADE,
  parking_id      UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  distance_meters INT  NOT NULL DEFAULT 0,
  walk_minutes    INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (venue_id, parking_id)
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS event_parkings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  parking_id      UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  total_slots     INT  NOT NULL DEFAULT 0,
  slots_reserved  INT  NOT NULL DEFAULT 0,
  distance_meters INT,
  walk_minutes    INT,
  CONSTRAINT uq_event_parking UNIQUE (event_id, parking_id)
);

-- ── 8. vehicle_models table (catálogo NHTSA — se mantiene para compatibilidad) ──
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS vehicle_models (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  make     VARCHAR(100) NOT NULL,
  model    VARCHAR(100) NOT NULL,
  category VARCHAR(20)  NOT NULL,
  source   VARCHAR(20)  DEFAULT 'seed',
  active   BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_make_model UNIQUE (make, model)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_trgm
  ON vehicle_models USING gin((make || ' ' || model) gin_trgm_ops);

-- Sub-admin role support
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'operator', 'sub_operator', 'sub_admin', 'user'));
