-- ─────────────────────────────────────────────────────────────────────────────
-- 004 · Venues, multi-parking por evento y precios por tipo de vehículo
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla venues
CREATE TABLE IF NOT EXISTS venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  address     TEXT NOT NULL,
  lat         NUMERIC(9,6) NOT NULL,
  lng         NUMERIC(9,6) NOT NULL,
  photo_url   TEXT,
  category    VARCHAR(50) NOT NULL DEFAULT 'conciertos'
                CHECK (category IN ('conciertos','deportes','teatro','festival')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campos en events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_id  UUID REFERENCES venues(id),
  ADD COLUMN IF NOT EXISTS category  VARCHAR(100);

-- 3. Multi-parking por evento (slots propios por parking)
CREATE TABLE IF NOT EXISTS event_parkings (
  event_id         UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  parking_id       UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  distance_meters  INTEGER NOT NULL DEFAULT 0,
  walk_minutes     INTEGER NOT NULL DEFAULT 0,
  total_slots      INTEGER NOT NULL DEFAULT 50,
  slots_reserved   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, parking_id),
  CONSTRAINT ep_slots_valid CHECK (slots_reserved >= 0 AND slots_reserved <= total_slots)
);

CREATE INDEX IF NOT EXISTS idx_event_parkings_event   ON event_parkings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_parkings_parking ON event_parkings(parking_id);

-- 4. Precios por tipo de vehículo (por parking, no por evento)
CREATE TABLE IF NOT EXISTS parking_slots_pricing (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id   UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(20) NOT NULL
                 CHECK (vehicle_type IN ('Auto','Sub','Pick Up','Moto')),
  price        NUMERIC(10,2) NOT NULL,
  UNIQUE(parking_id, vehicle_type)
);

-- 5. La reserva guarda el parking elegido
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS parking_id UUID REFERENCES parkings(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED · Venues CDMX
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO venues (id, name, address, lat, lng, photo_url, category) VALUES
  ('v0000001-0000-0000-0000-000000000001',
   'Foro Sol', 'Viaducto Río de la Piedad 187, Iztacalco, CDMX',
   19.397793, -99.095947,
   'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
   'conciertos'),
  ('v0000002-0000-0000-0000-000000000002',
   'Estadio Azteca', 'Calz. de Tlalpan 3465, Sta. Úrsula Coapa, CDMX',
   19.302903, -99.150635,
   'https://images.unsplash.com/photo-1540747913346-19212a4b423b?w=800&q=80',
   'deportes'),
  ('v0000003-0000-0000-0000-000000000003',
   'Auditorio Nacional', 'Paseo de la Reforma 50, Polanco, CDMX',
   19.432723, -99.202437,
   'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
   'conciertos'),
  ('v0000004-0000-0000-0000-000000000004',
   'Palacio de los Deportes', 'Av. del Conscripto 311, Magdalena de las Salinas, CDMX',
   19.411733, -99.078590,
   'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
   'deportes')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED · Parkings cercanos a cada venue
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO parkings (id, name, address, lat, lng, total_capacity, is_active) VALUES
  -- Foro Sol
  ('p0000001-0000-0000-0000-000000000001',
   'Estacionamiento Foro Sol Norte',
   'Viaducto Río de la Piedad 200, CDMX', 19.399200, -99.096500, 200, true),
  ('p0000002-0000-0000-0000-000000000002',
   'Estacionamiento Iztacalco Centro',
   'Eje 3 Oriente 120, Iztacalco, CDMX', 19.395600, -99.093200, 150, true),
  -- Estadio Azteca
  ('p0000003-0000-0000-0000-000000000003',
   'Estacionamiento Azteca Oficial',
   'Calz. de Tlalpan 3400, CDMX', 19.303800, -99.152000, 500, true),
  ('p0000004-0000-0000-0000-000000000004',
   'Estacionamiento Santa Úrsula',
   'Av. Canal de Miramontes 2890, CDMX', 19.301500, -99.148000, 300, true),
  -- Auditorio Nacional
  ('p0000005-0000-0000-0000-000000000005',
   'Estacionamiento Auditorio Reforma',
   'Paseo de la Reforma 45, Polanco, CDMX', 19.433500, -99.203800, 180, true),
  ('p0000006-0000-0000-0000-000000000006',
   'Estacionamiento Polanco Sur',
   'Av. Ejército Nacional 700, CDMX', 19.431000, -99.200500, 120, true),
  -- Palacio de los Deportes
  ('p0000007-0000-0000-0000-000000000007',
   'Estacionamiento Deportes Peñón',
   'Av. Río Consulado 4390, CDMX', 19.412500, -99.079800, 250, true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED · Pricing por tipo de vehículo
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO parking_slots_pricing (parking_id, vehicle_type, price) VALUES
  -- p1 Foro Sol Norte
  ('p0000001-0000-0000-0000-000000000001','Auto',   180),
  ('p0000001-0000-0000-0000-000000000001','Sub',    220),
  ('p0000001-0000-0000-0000-000000000001','Pick Up',240),
  ('p0000001-0000-0000-0000-000000000001','Moto',   100),
  -- p2 Iztacalco Centro
  ('p0000002-0000-0000-0000-000000000002','Auto',   160),
  ('p0000002-0000-0000-0000-000000000002','Sub',    200),
  ('p0000002-0000-0000-0000-000000000002','Pick Up',220),
  ('p0000002-0000-0000-0000-000000000002','Moto',    90),
  -- p3 Azteca Oficial
  ('p0000003-0000-0000-0000-000000000003','Auto',   200),
  ('p0000003-0000-0000-0000-000000000003','Sub',    250),
  ('p0000003-0000-0000-0000-000000000003','Pick Up',280),
  ('p0000003-0000-0000-0000-000000000003','Moto',   120),
  -- p4 Santa Úrsula
  ('p0000004-0000-0000-0000-000000000004','Auto',   170),
  ('p0000004-0000-0000-0000-000000000004','Sub',    210),
  ('p0000004-0000-0000-0000-000000000004','Pick Up',230),
  ('p0000004-0000-0000-0000-000000000004','Moto',   100),
  -- p5 Auditorio Reforma
  ('p0000005-0000-0000-0000-000000000005','Auto',   220),
  ('p0000005-0000-0000-0000-000000000005','Sub',    270),
  ('p0000005-0000-0000-0000-000000000005','Pick Up',300),
  ('p0000005-0000-0000-0000-000000000005','Moto',   130),
  -- p6 Polanco Sur
  ('p0000006-0000-0000-0000-000000000006','Auto',   200),
  ('p0000006-0000-0000-0000-000000000006','Sub',    250),
  ('p0000006-0000-0000-0000-000000000006','Pick Up',270),
  ('p0000006-0000-0000-0000-000000000006','Moto',   120),
  -- p7 Deportes Peñón
  ('p0000007-0000-0000-0000-000000000007','Auto',   190),
  ('p0000007-0000-0000-0000-000000000007','Sub',    230),
  ('p0000007-0000-0000-0000-000000000007','Pick Up',250),
  ('p0000007-0000-0000-0000-000000000007','Moto',   110)
ON CONFLICT (parking_id, vehicle_type) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED · Ligar el evento existente al venue Foro Sol + ambos parkings
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE events
  SET venue_id = 'v0000001-0000-0000-0000-000000000001', category = 'REGIONAL MEX'
  WHERE id = 'c0000001-0000-0000-0000-000000000001';

INSERT INTO event_parkings (event_id, parking_id, distance_meters, walk_minutes, total_slots) VALUES
  ('c0000001-0000-0000-0000-000000000001','p0000001-0000-0000-0000-000000000001', 180, 3, 100),
  ('c0000001-0000-0000-0000-000000000001','p0000002-0000-0000-0000-000000000002', 420, 6,  80)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED · Eventos adicionales por venue
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO events (id, name, venue_name, starts_at, ends_at, price, total_slots, status, category, venue_id, parking_id) VALUES
  -- Foro Sol
  ('c0000002-0000-0000-0000-000000000002',
   'Bad Bunny', 'Foro Sol', '2026-07-12 21:00', '2026-07-13 01:00',
   350, 200, 'active', 'REGGAETÓN',
   'v0000001-0000-0000-0000-000000000001','p0000001-0000-0000-0000-000000000001'),
  -- Azteca
  ('c0000003-0000-0000-0000-000000000003',
   'América vs Chivas', 'Estadio Azteca', '2026-07-19 19:00', '2026-07-19 21:00',
   120, 500, 'active', 'FÚTBOL',
   'v0000002-0000-0000-0000-000000000002','p0000003-0000-0000-0000-000000000003'),
  -- Auditorio
  ('c0000004-0000-0000-0000-000000000004',
   'Café Tacvba 35 Años', 'Auditorio Nacional', '2026-08-02 20:00', '2026-08-02 23:00',
   280, 180, 'active', 'ROCK',
   'v0000003-0000-0000-0000-000000000003','p0000005-0000-0000-0000-000000000005'),
  -- Palacio
  ('c0000005-0000-0000-0000-000000000005',
   'Lucha Libre AAA', 'Palacio de los Deportes', '2026-08-09 18:00', '2026-08-09 21:30',
   150, 300, 'active', 'LUCHA LIBRE',
   'v0000004-0000-0000-0000-000000000004','p0000007-0000-0000-0000-000000000007')
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_parkings (event_id, parking_id, distance_meters, walk_minutes, total_slots) VALUES
  ('c0000002-0000-0000-0000-000000000002','p0000001-0000-0000-0000-000000000001', 180, 3, 120),
  ('c0000002-0000-0000-0000-000000000002','p0000002-0000-0000-0000-000000000002', 420, 6,  80),
  ('c0000003-0000-0000-0000-000000000003','p0000003-0000-0000-0000-000000000003', 200, 3, 300),
  ('c0000003-0000-0000-0000-000000000003','p0000004-0000-0000-0000-000000000004', 550, 8, 200),
  ('c0000004-0000-0000-0000-000000000004','p0000005-0000-0000-0000-000000000005', 150, 2, 100),
  ('c0000004-0000-0000-0000-000000000004','p0000006-0000-0000-0000-000000000006', 380, 5,  80),
  ('c0000005-0000-0000-0000-000000000005','p0000007-0000-0000-0000-000000000007', 220, 3, 200)
ON CONFLICT DO NOTHING;
