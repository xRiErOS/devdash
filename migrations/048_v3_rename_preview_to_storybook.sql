-- DD-520: Live-Preview-iframe entfaellt (DD-521); das projects.preview_base_url-Feld
-- wird zur Storybook-URL des Projekts umgewidmet (PO D51 / Memory 237, 2026-06-09).
-- SQLite 3.25+ unterstuetzt RENAME COLUMN ohne Table-Rebuild.
ALTER TABLE projects RENAME COLUMN preview_base_url TO storybook_url;
