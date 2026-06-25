-- DD-192: backlog.test_instruction für PO-Review-Effizienz.
-- Vom Entwickler beim Setzen auf to_review/passed gefüllt; PO sieht das Feld
-- read-only in der Review-Ansicht des Issues. Schema: TEXT, NULL erlaubt.
ALTER TABLE backlog ADD COLUMN test_instruction TEXT;
