BEGIN;

ALTER TABLE labeled_cases
  ADD COLUMN IF NOT EXISTS criteria_id uuid REFERENCES assignment_criteria(id);

ALTER TABLE labeled_case_checkpoints
  ADD COLUMN IF NOT EXISTS valoracion text;

ALTER TABLE legal_acceptances
  ADD COLUMN IF NOT EXISTS data_research_consent boolean;

COMMIT;
