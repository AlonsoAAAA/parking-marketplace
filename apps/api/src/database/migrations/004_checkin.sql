CREATE TABLE IF NOT EXISTS vehicle_checkins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
  plate          VARCHAR(20) NOT NULL,
  photo_front    TEXT NOT NULL,
  photo_back     TEXT NOT NULL,
  photo_left     TEXT NOT NULL,
  photo_right    TEXT NOT NULL,
  checked_in_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_reservation ON vehicle_checkins(reservation_id);
