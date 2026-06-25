-- DD-120: Beschreibung-Feld entfällt aus UI. Bestehende description-Werte werden
-- als Prefix in goal eingefügt. Spalte description bleibt aus Audit-Gründen erhalten.
-- Idempotent: nur Items mit description != '' und description nicht bereits in goal enthalten.

UPDATE backlog
SET goal = TRIM(description || CHAR(10) || CHAR(10) || COALESCE(goal, ''))
WHERE description IS NOT NULL
  AND TRIM(description) != ''
  AND (goal IS NULL OR INSTR(COALESCE(goal, ''), description) = 0);
