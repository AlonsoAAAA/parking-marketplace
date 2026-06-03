-- 008_normalize_vehicle_types.sql
-- Normaliza los valores de vehicle_type en parking_slots_pricing
-- del formato antiguo (Auto, Sub, Pick Up, Moto) al nuevo formato
-- (auto, suv_camioneta, pickup, moto) que usa el panel de admin.

-- 1. Eliminar constraint de check con los valores viejos
ALTER TABLE parking_slots_pricing
  DROP CONSTRAINT IF EXISTS parking_slots_pricing_vehicle_type_check;

-- 2. Migrar datos existentes
UPDATE parking_slots_pricing SET vehicle_type = 'auto'          WHERE vehicle_type = 'Auto';
UPDATE parking_slots_pricing SET vehicle_type = 'suv_camioneta' WHERE vehicle_type = 'Sub';
UPDATE parking_slots_pricing SET vehicle_type = 'pickup'        WHERE vehicle_type = 'Pick Up';
UPDATE parking_slots_pricing SET vehicle_type = 'moto'          WHERE vehicle_type = 'Moto';

-- 3. Agregar nuevo constraint con los valores actualizados
ALTER TABLE parking_slots_pricing
  ADD CONSTRAINT parking_slots_pricing_vehicle_type_check
  CHECK (vehicle_type IN ('auto', 'suv_camioneta', 'pickup', 'moto'));
