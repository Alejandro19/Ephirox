-- Fase 7 del rediseño del módulo Stress (spec punto 21.2 — índice propio
-- "Capacidad de regulación", ver docs/prompt-ajustes-flujo-narrativo.md y
-- /Users/alejandrogarcia/.claude/plans/eager-cuddling-mountain.md). Servicio
-- hermano de Carga Cognitiva, no una extensión — fórmula y fuente distintas.
-- Detrás de un feature flag hasta aprobación clínica de los pesos (ver
-- REGULATION_CAPACITY_ENABLED_IN_PRODUCTION en regulation-capacity.service.ts).
-- This project has no automated DB migration system; run this SQL manually
-- against the dev and test Supabase databases via the SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS regulation_capacity_baselines (
  client_id uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  hrv_avg numeric(6,2),
  fc_reposo_avg numeric(6,2),
  sueno_score_avg numeric(6,2),
  days_used integer NOT NULL,
  fixed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regulation_capacity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  score numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, fecha)
);
CREATE INDEX IF NOT EXISTS regulation_capacity_history_client_id_idx ON regulation_capacity_history(client_id);

COMMIT;
