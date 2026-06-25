-- D10 (2026-06-19): milestone_dod_items — optionales Freitext-Feld details (Beschreibung).
-- Additive Migration: ALTER TABLE + NULL-Default, kein Rewrite, kein Datenverlust.
ALTER TABLE milestone_dod_items ADD COLUMN details TEXT;
