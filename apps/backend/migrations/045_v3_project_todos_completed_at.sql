-- DD-363 (DD#49 M3-Finalisierung): project_todos.completed_at — Timestamp wann ein ToDo
--   auf status='done' gesetzt wurde. Default-Filter im Project-Home ToDo-Tab zeigt nur
--   offene + HEUTE erledigte ToDos; ohne completed_at ließe sich "heute erledigt" nicht
--   serverseitig ableiten.
-- Backfill: bestehende erledigte ToDos bekommen updated_at als Näherungswert (best effort —
--   den exakten Done-Zeitpunkt gibt es historisch nicht; updated_at ist die nächstbeste Quelle).

ALTER TABLE project_todos ADD COLUMN completed_at DATETIME;

UPDATE project_todos SET completed_at = updated_at WHERE status = 'done' AND completed_at IS NULL;
