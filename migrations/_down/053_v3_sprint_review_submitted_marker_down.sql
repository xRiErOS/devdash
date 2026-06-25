-- 053_v3_sprint_review_submitted_marker_down.sql (reverse)
--
-- DD-507 (reverse): Den additiven, nullable Marker wieder entfernen.
-- SQLite >= 3.35 unterstuetzt DROP COLUMN nativ (vgl. 051_v3 down).

ALTER TABLE sprints DROP COLUMN review_submitted_at;
