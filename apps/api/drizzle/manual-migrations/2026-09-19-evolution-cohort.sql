BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS cohort_leader_id uuid REFERENCES clients(id);

COMMIT;
