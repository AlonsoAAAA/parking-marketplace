-- 010_staging_seed — datos ficticios para entornos vacíos (staging/desarrollo)
-- No-op si ya hay venues (ej. producción), así que es seguro dejarla en el
-- historial de migraciones aunque esta rama se mezcle con main más adelante.

DO $$
DECLARE
  v_foro_sol  UUID := gen_random_uuid();
  v_azteca    UUID := gen_random_uuid();
  p_foro_sol  UUID := gen_random_uuid();
  p_azteca    UUID := gen_random_uuid();
  e_concierto UUID := gen_random_uuid();
  e_partido   UUID := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM venues) THEN
    RETURN;
  END IF;

  INSERT INTO venues (id, name, city, address, capacity, lat, lng, photo_url, category) VALUES
    (v_foro_sol, 'Foro Sol',       'CDMX', 'Viaducto Río de la Piedad 187, CDMX', 65000, 19.403694, -99.096476, NULL, 'conciertos'),
    (v_azteca,   'Estadio Azteca', 'CDMX', 'Calzada de Tlalpan 3465, CDMX',       87000, 19.302893, -99.150470, NULL, 'deportes');

  INSERT INTO parkings (id, owner_id, name, address, lat, lng, total_capacity, is_active) VALUES
    (p_foro_sol, NULL, 'Estacionamiento Foro Sol Norte', 'Av. Río Churubusco s/n, CDMX', 19.404500, -99.097200, 50, true),
    (p_azteca,   NULL, 'Estacionamiento Azteca Sur',     'Calz. de Tlalpan 3000, CDMX',  19.301800, -99.151200, 60, true);

  INSERT INTO venue_parkings (venue_id, parking_id, distance_meters, walk_minutes) VALUES
    (v_foro_sol, p_foro_sol, 250, 4),
    (v_azteca,   p_azteca,   400, 6);

  INSERT INTO events (id, parking_id, venue_id, name, venue_name, starts_at, ends_at, price, total_slots, slots_reserved, status, category) VALUES
    (e_concierto, p_foro_sol, v_foro_sol, 'Concierto de Prueba — Banda Staging',  'Foro Sol',       NOW() + INTERVAL '7 days',  NOW() + INTERVAL '7 days 4 hours',  180.00, 50, 0, 'active', 'conciertos'),
    (e_partido,   p_azteca,   v_azteca,   'Partido de Prueba — Liga Staging',     'Estadio Azteca', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days 3 hours', 220.00, 60, 0, 'active', 'deportes');

  INSERT INTO parking_slots_pricing (parking_id, vehicle_type, price, slots) VALUES
    (p_foro_sol, 'auto',          180, 30),
    (p_foro_sol, 'suv_camioneta', 220, 10),
    (p_foro_sol, 'pickup',        200, 5),
    (p_foro_sol, 'moto',          90,  5),
    (p_azteca,   'auto',          220, 35),
    (p_azteca,   'suv_camioneta', 260, 15),
    (p_azteca,   'pickup',        240, 5),
    (p_azteca,   'moto',          110, 5);

  INSERT INTO vehicle_models (make, model, category) VALUES
    ('Nissan',     'Versa',    'auto'),
    ('Toyota',     'Corolla',  'auto'),
    ('Volkswagen', 'Jetta',    'auto'),
    ('Honda',      'CR-V',     'suv_camioneta'),
    ('Chevrolet',  'Suburban', 'suv_camioneta'),
    ('Mazda',      'CX-5',     'suv_camioneta'),
    ('Ford',       'F-150',    'pickup'),
    ('Toyota',     'Hilux',    'pickup'),
    ('Honda',      'CBR500R',  'moto'),
    ('Yamaha',     'FZ-25',    'moto')
  ON CONFLICT (make, model) DO NOTHING;
END $$;
