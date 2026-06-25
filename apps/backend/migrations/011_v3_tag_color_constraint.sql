-- DD-53: Tag-Farb-Auswahl auf 6 Catppuccin-Farben begrenzen.
-- Restliche 8 Farben werden auf 'overlay0' (neutral) gemappt.

UPDATE tags
   SET color = 'overlay0'
 WHERE color NOT IN ('blue', 'green', 'peach', 'mauve', 'teal', 'overlay0');
