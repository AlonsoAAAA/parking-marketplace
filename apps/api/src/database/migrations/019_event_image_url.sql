-- Foto de portada del evento (URL externa, sin subida de archivos por ahora).
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
