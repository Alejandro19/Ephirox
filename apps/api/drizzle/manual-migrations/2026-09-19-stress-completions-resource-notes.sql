BEGIN;

ALTER TABLE stress_completions
  ADD COLUMN IF NOT EXISTS notes text;

COMMIT;
