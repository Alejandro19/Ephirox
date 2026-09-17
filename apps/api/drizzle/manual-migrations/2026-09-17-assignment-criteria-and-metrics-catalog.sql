-- Fase 5 del rediseño del módulo Stress (spec punto 21.1 — motor de
-- criterios + catálogo de marcadores, ver docs/prompt-ajustes-flujo-narrativo.md
-- y /Users/alejandrogarcia/.claude/plans/eager-cuddling-mountain.md). Cierra
-- también la FK de stress_protocols.criteria_id que quedó suelta en la
-- migración de la Fase 2 (2026-09-17-stress-protocols.sql). This project has
-- no automated DB migration system; run this SQL manually against the dev
-- and test Supabase databases via the SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS metrics_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text,
  source text NOT NULL,
  field_key text NOT NULL,
  aggregation text NOT NULL DEFAULT 'latest',
  reference_range jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]',
  applicable_modules text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'borrador',
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES admins(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stress_protocols
  ADD CONSTRAINT stress_protocols_criteria_id_fkey
  FOREIGN KEY (criteria_id) REFERENCES assignment_criteria(id);

COMMIT;
