-- DD-392: per-project public_capture flag.
--   issues.familie-riedel.org ist öffentlich (Cloudflare). Ohne Flag würde der
--   öffentliche Capture-Host die Projektliste aller Projekte leaken und Issues in
--   beliebige Projekte zulassen. public_capture macht die öffentliche Exposition
--   zur bewussten Per-Projekt-Opt-in-Entscheidung.
-- Default 0 (privat): bestehende Projekte sind NICHT öffentlich. Nur explizit
--   freigegebene Projekte sind über den öffentlichen Deep-Link /catch/<slug>
--   erreichbar und nehmen öffentliche POST /api/issues an.

ALTER TABLE projects ADD COLUMN public_capture INTEGER NOT NULL DEFAULT 0;
