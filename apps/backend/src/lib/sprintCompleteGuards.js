export function listSprintIssuesMissingResult(db, sprintId) {
  return db.prepare(`
    SELECT b.id, b.project_number, b.title, b.status, p.prefix AS project_prefix
    FROM backlog b
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.assigned_sprint = ?
      AND b.status IN ('done','passed')
      AND (b.result IS NULL OR TRIM(b.result) = '')
    ORDER BY b.project_number, b.id
  `).all(sprintId).map(row => ({
    ...row,
    key: row.project_prefix && row.project_number != null
      ? `${row.project_prefix}-${row.project_number}`
      : `#${row.id}`,
  }))
}
