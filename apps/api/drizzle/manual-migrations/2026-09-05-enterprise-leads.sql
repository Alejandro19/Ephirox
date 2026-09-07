-- Formulario "Llevar Ephirox a mi empresa" de la landing pública
-- (ephirox.com/landing) — sin relación a `clients`, es un lead comercial.
-- Aplicado a mano (nunca drizzle-kit push) contra DATABASE_URL y
-- TEST_DATABASE_URL el 2026-09-05.
CREATE TABLE IF NOT EXISTS enterprise_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  empresa text NOT NULL,
  rol text NOT NULL,
  tamano text,
  quien text,
  created_at timestamptz DEFAULT now()
);
