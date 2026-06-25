-- 034_v3_backlog_acceptance_criteria.sql - DD-311 Issue acceptance criteria
-- Adds a dedicated refinement field for QA/acceptance criteria.
-- NULL default preserves all existing backlog rows without mutation.

ALTER TABLE backlog ADD COLUMN acceptance_criteria TEXT;
