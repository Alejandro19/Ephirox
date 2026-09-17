-- Fase 2 del rediseño del módulo Stress (spec punto 18, ver
-- docs/prompt-ajustes-flujo-narrativo.md y
-- /Users/alejandrogarcia/.claude/plans/eager-cuddling-mountain.md): librería
-- de protocolos reutilizables — el admin arma un protocolo UNA vez
-- (mecanismo + recursos), se asigna a muchos clientes (asignación real
-- llega en la Fase 3/4 del plan; esta migración solo crea el modelo de
-- datos y la librería). stress_techniques (por-cliente, legacy) NO se toca
-- ni se migra — sigue de solo lectura para el historial ya registrado. This
-- project has no automated DB migration system; run this SQL manually
-- against the dev and test Supabase databases via the SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS stress_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mechanism text,
  status text NOT NULL DEFAULT 'borrador',
  criteria_id uuid,
  created_by uuid REFERENCES admins(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stress_protocol_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES stress_protocols(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  duration_minutes integer,
  duration_seconds integer,
  instructions text,
  audio_url text,
  audio_name text,
  video_url text,
  video_name text,
  youtube_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stress_protocol_resources_protocol_id_idx ON stress_protocol_resources(protocol_id);

ALTER TABLE stress_completions
  ADD COLUMN IF NOT EXISTS resource_id uuid REFERENCES stress_protocol_resources(id) ON DELETE SET NULL;

COMMIT;
