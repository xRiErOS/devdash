-- DD-195 R4: KI-Zusammenfassung pro Projekt persistieren.
-- Erlaubt Re-Open ohne neuen LLM-Call und Stale-Indikator (älter als 24h).
ALTER TABLE projects ADD COLUMN ai_summary TEXT;
ALTER TABLE projects ADD COLUMN ai_next_steps TEXT;
ALTER TABLE projects ADD COLUMN ai_summary_at DATETIME;
