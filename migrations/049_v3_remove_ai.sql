-- DD-522: Komplette KI/AI-Entfernung (PO-Decision D49).
-- Entfernt die KI-Zusammenfassung-Spalten (024), das AI-Cost-Tracking (025)
-- sowie die zugehoerigen Settings-Keys (009/025).
-- DROP COLUMN ist native SQLite 3.35+ — die 3 projects-Spalten sind
-- unconstrained TEXT/DATETIME, daher kein Table-Rebuild noetig.
ALTER TABLE projects DROP COLUMN ai_summary;
ALTER TABLE projects DROP COLUMN ai_next_steps;
ALTER TABLE projects DROP COLUMN ai_summary_at;

DROP TABLE IF EXISTS ai_cost_events;
DROP TABLE IF EXISTS ai_pricing;

DELETE FROM settings WHERE key IN ('ANTHROPIC_API_KEY', 'AI_COST_LIMIT_USD');
