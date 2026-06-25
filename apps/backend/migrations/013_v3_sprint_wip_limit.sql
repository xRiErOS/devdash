-- DD-41: WIP-Limit pro Sprint. NULL = kein Limit (Backwards-compat).
ALTER TABLE sprints ADD COLUMN wip_limit INTEGER;

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('013_v3_sprint_wip_limit');
