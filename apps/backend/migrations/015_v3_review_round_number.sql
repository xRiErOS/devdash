-- DD-99: review_feedback.round_number NOT NULL DEFAULT 1 + Index (backlog_id, round_number)
-- Spalte existiert bereits via Bootstrap (DEFAULT 1, nullable). Diese Migration:
--   1. backfilled NULL-Bestand auf 1 (idempotent)
--   2. recreated review_feedback mit NOT NULL constraint
--   3. legt zusammengesetzten Index an
-- defer_foreign_keys, damit FK von review_screenshots nicht waehrend Recreate bricht.

PRAGMA defer_foreign_keys = ON;

UPDATE review_feedback SET round_number = 1 WHERE round_number IS NULL;
UPDATE review_feedback SET review_status = 'pending' WHERE review_status IS NULL;

CREATE TABLE review_feedback_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backlog_id INTEGER NOT NULL REFERENCES backlog(id),
    status TEXT NOT NULL DEFAULT 'pending',
    comment TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    round_number INTEGER NOT NULL DEFAULT 1,
    review_status TEXT NOT NULL DEFAULT 'pending'
);

INSERT INTO review_feedback_new (id, backlog_id, status, comment, notes, created_at, updated_at, round_number, review_status)
  SELECT id, backlog_id, status, comment, notes, created_at, updated_at,
         COALESCE(round_number, 1), COALESCE(review_status, 'pending')
  FROM review_feedback;

DROP TABLE review_feedback;
ALTER TABLE review_feedback_new RENAME TO review_feedback;

CREATE INDEX idx_review_feedback_backlog ON review_feedback(backlog_id);
CREATE INDEX idx_review_feedback_backlog_round ON review_feedback(backlog_id, round_number);
