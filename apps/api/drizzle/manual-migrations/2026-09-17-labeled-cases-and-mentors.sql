-- Fase 3 del rediseño del módulo Stress (spec punto 17 — "Caso Etiquetado" /
-- Data Network Effect, ver docs/prompt-ajustes-flujo-narrativo.md y
-- /Users/alejandrogarcia/.claude/plans/eager-cuddling-mountain.md). Tablas
-- genéricas pensadas para los 4 módulos de contenido (Stress/Workout/
-- Nutrition/Sleep), pero en esta ronda solo Stress tiene UI de asignación
-- real. mentors es un catálogo simple SIN login (confirmado con Alejandro).
-- This project has no automated DB migration system; run this SQL manually
-- against the dev and test Supabase databases via the SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labeled_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number serial NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  module text NOT NULL,
  protocol_id uuid,
  mentor_id uuid REFERENCES mentors(id),
  assigned_by uuid NOT NULL REFERENCES admins(id),
  baseline_snapshot jsonb NOT NULL DEFAULT '{}',
  cycle_weeks integer NOT NULL DEFAULT 12,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  outcome text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS labeled_cases_client_id_idx ON labeled_cases(client_id);
CREATE INDEX IF NOT EXISTS labeled_cases_module_idx ON labeled_cases(module);

CREATE TABLE IF NOT EXISTS labeled_case_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES labeled_cases(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, week_number)
);

-- Nota: stress_completions.resource_id ya se agregó en la migración de la
-- Fase 2 (2026-09-17-stress-protocols.sql) — no se repite acá.

COMMIT;
