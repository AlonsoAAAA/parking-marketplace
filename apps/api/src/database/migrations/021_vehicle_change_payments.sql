-- Cambios de vehículo post-compra: si el nuevo vehículo cae en una categoría
-- más cara, el usuario paga la diferencia antes de aplicarse el cambio (ver
-- PaymentsService.quoteVehicleChange/createVehicleChangeIntent). Se guarda
-- aparte de `payments` para no alterar el 1:1 reserva↔pago completado que
-- asumen las queries existentes (mis-boletos, ticket del operador, etc.).
CREATE TABLE IF NOT EXISTS vehicle_change_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id      UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  from_vehicle_type   VARCHAR(30) NOT NULL,
  to_vehicle_type     VARCHAR(30) NOT NULL,
  plate               VARCHAR(20) NOT NULL,
  make                VARCHAR(60) NOT NULL,
  model               VARCHAR(60) NOT NULL,
  version             VARCHAR(60),
  year                INT,
  color               VARCHAR(40),
  amount              DECIMAL(10,2) NOT NULL,
  provider_payment_id VARCHAR(200) UNIQUE NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  paid_at             TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_change_payments_reservation ON vehicle_change_payments(reservation_id);
