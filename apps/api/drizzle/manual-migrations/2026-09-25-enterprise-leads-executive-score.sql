BEGIN;

ALTER TABLE enterprise_leads
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS segmento text,
  ADD COLUMN IF NOT EXISTS programa text,
  ADD COLUMN IF NOT EXISTS evaluacion jsonb;

COMMIT;
