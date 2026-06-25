-- DD-220 (2026-05-20): Attribution von Backlog-Items zum erstellenden Authelia-
-- Remote-User. Spalte bleibt nullable; Befüllung erfolgt im App-Layer aus dem
-- Remote-User-Header. Kein Default, kein Backfill.

ALTER TABLE backlog ADD COLUMN created_by_user TEXT;
