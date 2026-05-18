-- 002_admin — venues, claims, promotions

CREATE TABLE IF NOT EXISTS venues (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  city       VARCHAR(100) NOT NULL DEFAULT 'CDMX',
  address    TEXT NOT NULL DEFAULT '',
  capacity   INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claims (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  subject        VARCHAR(300) NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  status         VARCHAR(20) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_notes    TEXT,
  resolved_at    TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       VARCHAR(50) UNIQUE NOT NULL,
  type       VARCHAR(10) NOT NULL DEFAULT 'percent'
               CHECK (type IN ('percent', 'fixed')),
  value      DECIMAL(10,2) NOT NULL,
  event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
  max_uses   INT,
  uses_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_user   ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_promo_code    ON promotions(code);
