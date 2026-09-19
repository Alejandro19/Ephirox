BEGIN;

ALTER TABLE stress_protocols
  ADD COLUMN IF NOT EXISTS suggested_frequency text,
  ADD COLUMN IF NOT EXISTS default_cycle_weeks integer NOT NULL DEFAULT 12;

COMMIT;
