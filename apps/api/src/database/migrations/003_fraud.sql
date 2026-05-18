CREATE TABLE IF NOT EXISTS fraud_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(200) NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  rule_key       VARCHAR(50) UNIQUE NOT NULL,
  threshold      INT NOT NULL DEFAULT 3,
  window_minutes INT NOT NULL DEFAULT 60,
  level          VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (level IN ('low', 'medium', 'high')),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  rule_id     UUID REFERENCES fraud_rules(id) ON DELETE SET NULL,
  rule_key    VARCHAR(50) NOT NULL,
  level       VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (level IN ('low', 'medium', 'high')),
  detail      JSONB NOT NULL DEFAULT '{}',
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user     ON fraud_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status   ON fraud_alerts (status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created  ON fraud_alerts (created_at DESC);

INSERT INTO fraud_rules (name, description, rule_key, threshold, window_minutes, level) VALUES
  ('Reservas rápidas',
   'Más de N reservas del mismo usuario en X minutos',
   'rapid_reservations', 3, 10, 'high'),
  ('Pagos fallidos repetidos',
   'Más de N pagos fallidos del mismo usuario en X minutos',
   'failed_payments', 2, 60, 'medium'),
  ('QR duplicado',
   'Intento de escanear un QR ya utilizado',
   'duplicate_scan', 1, 0, 'high'),
  ('Cancelaciones repetidas',
   'Reserva cancelada más de N veces por el mismo usuario en el mismo evento',
   'repeat_cancel', 3, 0, 'medium')
ON CONFLICT (rule_key) DO NOTHING;
