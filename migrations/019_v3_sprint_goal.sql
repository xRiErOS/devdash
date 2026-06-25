-- DD-142: Sprintziel als eigenes Feld in sprints-Tabelle.
-- Bestehende notes als initiale goal übernehmen, da bisher notes als Sprintziel gerendert wurde.
ALTER TABLE sprints ADD COLUMN goal TEXT;
UPDATE sprints SET goal = notes WHERE goal IS NULL AND notes IS NOT NULL AND TRIM(notes) != '';
