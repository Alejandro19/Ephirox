-- Punto 12.1 de docs/prompt-ajustes-flujo-narrativo.md: rediseño del
-- formulario de la landing con revelado progresivo — recupera Empresa/Cargo/
-- Tamaño de cohorte (ya existían como columnas nullable) y agrega dos
-- campos nuevos: Sede/País y Sitio web de la empresa. This project has no
-- automated DB migration system; run this SQL manually against the dev and
-- test Supabase databases via the SQL Editor.

BEGIN;

ALTER TABLE enterprise_leads ADD COLUMN IF NOT EXISTS pais text;
ALTER TABLE enterprise_leads ADD COLUMN IF NOT EXISTS sitio_web text;

COMMIT;
