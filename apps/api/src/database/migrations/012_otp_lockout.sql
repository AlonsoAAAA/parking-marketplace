-- Migración 012: protección de fuerza bruta en OTP (attempts / locked_until)
-- Estas columnas ya existían en las bases de datos desplegadas (agregadas
-- manualmente en algún momento), pero nunca quedó registrada la migración
-- correspondiente. Este archivo cierra ese hueco para que cualquier entorno
-- nuevo (local, staging, prod desde cero) quede con el mismo esquema.

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS attempts     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
