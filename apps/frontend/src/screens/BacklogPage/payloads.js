// GF-2 /dd-screen T03 — Pure Payload-Builder der BacklogPage-Actions.
// Jeder Builder formt exakt den Body, den der zugehörige /api/backlog-Endpoint
// erwartet. Validiert in tests/frontend-rework/backlog-payloads.test.js gegen die
// GETEILTEN Zod-Contracts (contracts/backlog.contracts.js) — kein dupliziertes
// Payload-Literal (Drift-Achse 1, Contract-Drift). Keine Fetch-/Store-Kopplung.

/** POST /api/backlog — issueCreateContract. priority wird zu number coerced. */
export function buildCreatePayload(input = {}) {
  const { title, type, priority, status, po_notes, tag_ids, assigned_sprint, goal, background } = input
  const body = { title, type }
  if (priority != null && priority !== '') body.priority = Number(priority)
  if (status) body.status = status
  if (po_notes != null) body.po_notes = po_notes
  if (Array.isArray(tag_ids) && tag_ids.length) body.tag_ids = tag_ids
  if (assigned_sprint != null) body.assigned_sprint = assigned_sprint
  if (goal != null) body.goal = goal
  if (background != null) body.background = background
  return body
}

/** PATCH /api/backlog/:id/status — issueStatusContract. Leere notes werden weggelassen. */
export function buildStatusPayload(status, notes) {
  const body = { status }
  if (notes) body.notes = notes
  return body
}

/** PATCH /api/backlog/:id/sprint — issueAssignSprintContract. '' / null → sprint lösen. */
export function buildAssignSprintPayload(sprintId) {
  const n = sprintId === '' || sprintId == null ? null : Number(sprintId)
  return { sprint_id: n }
}

/** PUT /api/backlog/:id — issueUpdateContract. Spiegelt die DD-526-Legacy-Verdrahtung. */
export function buildFieldUpdatePayload(field, value) {
  switch (field) {
    case 'type':
      return { type: value }
    case 'priority':
      return { priority: Number(value) }
    case 'milestone':
      return { milestone: value || null }
    default:
      throw new Error(`buildFieldUpdatePayload: unbekanntes Feld ${field}`)
  }
}

/** PATCH /api/backlog/bulk — backlogBulkContract. */
export function buildBulkPayload(ids, action, payload) {
  const body = { ids, action }
  if (payload) body.payload = payload
  return body
}

/**
 * PUT /api/backlog/:id — issueUpdateContract.
 * Baut den Update-Payload aus IssueForm.onSubmit-values:
 * Entfernt sprint_id (gehört NICHT in issueUpdateContract — PATCH .../:id/sprint).
 * Nur defined/non-null Felder werden eingeschlossen.
 * @param {object} values - Werte aus IssueForm.onSubmit({ values })
 * @returns {object} Body für PUT /api/backlog/:id
 */
export function buildUpdatePayloadFromFormValues(values = {}) {
  // Felder aus issueUpdateContract (ohne sprint_id — eigener Pfad)
  const UPDATE_FIELDS = [
    'title', 'type', 'priority', 'milestone', 'plugin_key',
    'goal', 'background', 'context_notes', 'relevant_files',
    'po_notes', 'result', 'description', 'files',
  ]
  const body = {}
  for (const key of UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      body[key] = values[key]
    }
  }
  return body
}
