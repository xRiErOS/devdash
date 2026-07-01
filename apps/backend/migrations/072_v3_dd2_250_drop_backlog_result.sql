-- Welle 4 T04a / DD2-250: result-Feld entfernen.
-- Das pre-Review-Relikt backlog.result wird ersatzlos entfernt (Decision D14):
-- Wissensbasis ist jetzt project_memory + Git-Historie, kein issue-gebundener
-- Result-Blob mehr. Lessons wurden vor dem Drop nach project_memory migriert,
-- der Diff steckt in der Git-Historie. sqlite >= 3.35 (Prod/Dev 3.53) → DROP COLUMN.
ALTER TABLE backlog DROP COLUMN result;
