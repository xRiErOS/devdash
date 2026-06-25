// GF-2 Wave D / D4 (T03, D-L): Sprint-Completeness — computed aus den Sprint-Issues.
// Eigener Endpoint (kein Enrichment von GET /api/sprints/:id, Back-Compat BE-Q02).
// Story-Points existieren NICHT im backlog/sprints-Schema → issues-only (points: null).
// Zähl-Logik gespiegelt aus den bestehenden Sprint-Subqueries (api.js:1208, DD-524):
//   total  = status != 'cancelled'   (cancelled zählt nicht in total, DD-524)
//   done   = status IN ('done','passed')
// SUM(CASE …) statt FILTER für maximale SQLite-Kompatibilität.

export function computeSprintCompleteness(db, sprintId) {
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) AS issues_total,
      SUM(CASE WHEN status IN ('done','passed') THEN 1 ELSE 0 END) AS issues_done,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS issues_cancelled
    FROM backlog
    WHERE assigned_sprint = ?
  `).get(sprintId)

  const issues_total = row?.issues_total ?? 0
  const issues_done = row?.issues_done ?? 0
  const issues_cancelled = row?.issues_cancelled ?? 0
  const issues_open = issues_total - issues_done
  const percent_complete = issues_total > 0 ? Math.round((issues_done / issues_total) * 100) : 0

  return {
    sprint_id: sprintId,
    issues_total,
    issues_done,
    issues_open,
    issues_cancelled,
    percent_complete,
    // Story-Points im DevDash-Datenmodell nicht vorhanden → explizit null (D-L/Map-Befund).
    points: null,
  }
}
