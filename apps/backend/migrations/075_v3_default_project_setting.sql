-- Migration 075: Konfigurierbarer Default-Projekt-Anker.
--
-- Bisher war Projekt id=1 hart als Default verdrahtet: currentProjectId() fällt
-- auf 1 zurück (Ziel unscopeter Writes) und die Projekt-Löschsperre blockt id=1.
-- Das machte das Initial-Projekt (id=1) unlöschbar. Dieser Key macht den Anker
-- konfigurierbar (setzbar über die TUI-Settings). Wert = numerische Projekt-id
-- als TEXT. NULL/unbekannt/gelöscht → Backend fällt auf 1 zurück (Verhalten
-- unverändert, bis explizit gesetzt).

INSERT OR IGNORE INTO settings (key, description, is_secret) VALUES
  ('default_project_id', 'Default-Projekt-Anker (numerische id): Fallback für unscopte Requests + löschgeschützt. Leer = 1.', 0);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('075_v3_default_project_setting');
