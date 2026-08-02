-- Registra qué porcentaje del pago se reembolsó realmente (política escalonada
-- según anticipación al momento de solicitar el reembolso), para auditoría.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS refund_percent DECIMAL(5,2);
