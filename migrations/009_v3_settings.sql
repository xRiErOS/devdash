-- DD-27: Globale Settings-Tabelle (API-Keys etc.).
-- Schluessel/Wert-Speicher fuer globale Konfiguration. Werte werden im Klartext
-- in der lokalen DevD-DB abgelegt. Maskierung erfolgt im Frontend bzw. via
-- separater GET-Route, die nur die letzten 4 Zeichen ausliefert.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  is_secret INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bekannte Schluessel vorab anlegen (mit NULL-Wert), damit die UI sie auflisten kann.
INSERT OR IGNORE INTO settings (key, description, is_secret) VALUES
  ('ANTHROPIC_API_KEY', 'API-Key fuer Anthropic Claude (Sprint-Planung, Refinement)', 1);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('009_v3_settings');
