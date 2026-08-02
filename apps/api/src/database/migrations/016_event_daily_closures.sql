-- Permite a un operador marcar un evento como "no activo hoy" (ej. el
-- estacionamiento está cerrado ese día), sin cambiar el status global del evento.
CREATE TABLE IF NOT EXISTS event_daily_closures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  operator_id   UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  closed_date   DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_event_daily_closure UNIQUE (event_id, operator_id, closed_date)
);

CREATE INDEX IF NOT EXISTS idx_event_daily_closures_lookup
  ON event_daily_closures (event_id, closed_date);
