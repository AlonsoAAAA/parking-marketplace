-- qr_tokens.scanned_by no tenía ON DELETE, así que borrar a un operador que
-- ya había escaneado al menos un boleto fallaba con violación de FK (y el
-- error quedaba silenciado en el frontend — ver Settings.tsx handleDelete),
-- dejando al usuario "atorado" y bloqueando reusar su número de teléfono.
-- Se alinea con vehicle_checkins.checked_in_by, que ya usa SET NULL.
ALTER TABLE qr_tokens DROP CONSTRAINT IF EXISTS qr_tokens_scanned_by_fkey;
ALTER TABLE qr_tokens
  ADD CONSTRAINT qr_tokens_scanned_by_fkey
  FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL;
