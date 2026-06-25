-- 036_v3_description_soft_deprecated.sql - DD-313 description soft-deprecation
-- Audit-trail migration only: backlog.description remains in place as legacy
-- backup data, but active Backlog write paths ignore it and API issue responses
-- expose description as NULL. No data is deleted and no column is dropped.

SELECT 1;
