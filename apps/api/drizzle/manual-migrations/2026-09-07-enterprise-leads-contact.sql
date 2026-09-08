-- Agrega Correo y Celular al formulario "Llevar Ephirox a mi empresa" de la
-- landing pública. Nullable a propósito (leads existentes no tienen estos
-- datos) aunque el zod schema los exija para envíos nuevos.
-- Aplicado a mano (nunca drizzle-kit push) contra DATABASE_URL y
-- TEST_DATABASE_URL el 2026-09-07.
ALTER TABLE enterprise_leads ADD COLUMN IF NOT EXISTS correo text;
ALTER TABLE enterprise_leads ADD COLUMN IF NOT EXISTS celular text;
