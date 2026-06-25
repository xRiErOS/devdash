-- DD-5: Pro-Projekt Live-Preview-URL.
-- Bisher global via PREVIEW_BASE_URL (ENV). Mit Multi-Tenant brauchen wir
-- pro Projekt eine eigene URL (z.B. http://localhost:3000 fuer MyBaby,
-- http://localhost:5555 fuer DevD selbst). Wenn NULL, faellt das Frontend
-- auf den ENV-Default zurueck.

ALTER TABLE projects ADD COLUMN preview_base_url TEXT;

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('008_v3_project_preview_url');
