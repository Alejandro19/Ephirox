-- Agrega el pipeline de seguimiento del submódulo admin "Leads por
-- contactar": nuevo | contactado | preparando_propuesta |
-- propuesta_entregada | cerrado. 'nuevo' es el default (leads existentes
-- quedan en ese estado, todavía sin contactar).
-- Aplicado a mano (nunca drizzle-kit push) contra DATABASE_URL y
-- TEST_DATABASE_URL el 2026-09-08.
ALTER TABLE enterprise_leads ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'nuevo';
