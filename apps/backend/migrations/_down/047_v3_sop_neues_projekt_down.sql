-- Down für 047_v3_sop_neues_projekt.sql (DD-518). Entfernt nur die geseedete SOP-Row.
-- Die sops/sop_triggers-Tabellen (Migration 044) bleiben unberührt — diese Migration
-- legt keine Tabelle an, sie fügt nur eine Row ein.

DELETE FROM sops WHERE sop_key = 'neues-projekt-aufsetzen';
