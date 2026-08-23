-- Solo la foto de "Frente" es obligatoria en el check-in del vehículo
-- (ver apps/admin/src/pages/operator/Scanner.tsx) — las otras 3 quedan
-- como opcionales, así que ya no pueden ser NOT NULL.
ALTER TABLE vehicle_checkins
  ALTER COLUMN photo_back  DROP NOT NULL,
  ALTER COLUMN photo_left  DROP NOT NULL,
  ALTER COLUMN photo_right DROP NOT NULL;
