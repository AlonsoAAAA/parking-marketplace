-- 009_venues_geo — columnas de venues usadas por la app pero ausentes en migraciones previas
-- (agregadas manualmente en producción; se capturan aquí para entornos nuevos)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS lat       DECIMAL(9,6);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS lng       DECIMAL(9,6);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS category  VARCHAR(50);
