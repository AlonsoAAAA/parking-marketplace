-- Migración 011: soporte para solicitudes de reembolso

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS type            VARCHAR(30) DEFAULT 'complaint'
    CHECK (type IN ('complaint', 'refund_request')),
  ADD COLUMN IF NOT EXISTS evidence_photos JSONB DEFAULT '[]';

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS refund_id     VARCHAR(200),
  ADD COLUMN IF NOT EXISTS refunded_at   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(500);
