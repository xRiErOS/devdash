-- DD-213: Pro Projekt genau eine SSTD (Single Source of Truth Document) als
-- Markdown-Rohtext. Master-Quelle ist die DB; Vault-Pflege bleibt manuelle
-- PO-Aufgabe, kein Auto-Sync.

ALTER TABLE projects ADD COLUMN sstd_content TEXT;
ALTER TABLE projects ADD COLUMN sstd_updated_at DATETIME;
