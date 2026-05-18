-- ================================================================
-- PARKING MARKETPLACE — Migración inicial completa
-- Ejecutar en orden: 001 → 007
-- ================================================================

-- 001_users
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL DEFAULT '',
  email       VARCHAR(150) UNIQUE,
  phone       VARCHAR(20) UNIQUE NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'operator', 'user')),
  channel     VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('web', 'whatsapp', 'app')),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 002_otp_codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(20) UNIQUE NOT NULL,
  otp         VARCHAR(6) NOT NULL,
  verified    BOOLEAN DEFAULT false,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 003_parkings
CREATE TABLE IF NOT EXISTS parkings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  address         TEXT NOT NULL,
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  total_capacity  INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 004_events
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id      UUID REFERENCES parkings(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  venue_name      VARCHAR(200),
  starts_at       TIMESTAMP NOT NULL,
  ends_at         TIMESTAMP NOT NULL,
  price           DECIMAL(10,2) NOT NULL,
  total_slots     INT NOT NULL,
  slots_reserved  INT NOT NULL DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','sold_out','finished')),
  created_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT slots_valid CHECK (slots_reserved >= 0 AND slots_reserved <= total_slots)
);

-- 005_reservations
CREATE TABLE IF NOT EXISTS reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','used','cancelled','expired')),
  slot_label  VARCHAR(20),
  expires_at  TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 006_payments
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id      UUID REFERENCES reservations(id) ON DELETE CASCADE,
  provider            VARCHAR(20) NOT NULL DEFAULT 'stripe',
  provider_payment_id VARCHAR(200) UNIQUE NOT NULL,
  amount              DECIMAL(10,2) NOT NULL,
  currency            CHAR(3) DEFAULT 'MXN',
  status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  paid_at             TIMESTAMP,
  raw_webhook         JSONB,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- 007_qr_tokens
CREATE TABLE IF NOT EXISTS qr_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID REFERENCES reservations(id) ON DELETE CASCADE UNIQUE,
  token           TEXT NOT NULL UNIQUE,
  scanned_at      TIMESTAMP,
  scanned_by      UUID REFERENCES users(id),
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─── Índices para performance ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservations_event    ON reservations(event_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_user     ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id  ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token       ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_events_parking_status ON events(parking_id, status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at      ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_otp_phone             ON otp_codes(phone);
