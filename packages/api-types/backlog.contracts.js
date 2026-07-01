// @ts-check
// DD-560 (Sprint DD#78, Triplet 1/6): Autoritatives Zod-Contract-Modul für die
// backlog/issue-Payloads. Single Source — REST (server/api.js), CLI (bin/devd-cli.js)
// und MCP (mcp/devd-mcp.js) leiten hieraus ab (Muster aus project_memory
// CONTRACT-GATEWAY-PATTERN #303 / DD-557). Struktur-Validierung lebt hier; die
// Business-Regeln (refined→goal+background, Sprint-Auto-Status, Lifecycle-Transitions) bleiben
// in server/api.js + server/lib/lifecycle.js. E01.1/D09: issue-level acceptance_criteria +
// test_instruction sind ABGELOEST (user_stories[].qa = Single-Source per-US-Pruefgrundlage,
// contracts/userStory.contracts.js); daher aus Create/Update-Schema entfernt (harter Replace).
//
// T04b (Welle 4, D15/D16) — Acceptance-Gate auf user_stories (löst `result`-Relikt ab):
//   G1: Issue → `passed` nur, wenn ALLE user_stories us_verdict='accepted' haben
//       (Grandfathering Q06: 0 Stories = vacuously erfüllt). Guard: lifecycle.js
//       canTransition (to_review→passed, ctx.userStories).
//   G2: Sprint-Zuweisung nur bei COUNT(user_stories) >= 1 (nur NEUE Zuweisung, Q06).
//       Guard: lifecycle.js canAssignSprint(ctx.userStoryCount), verdrahtet im
//       Assign-Pfad (PATCH /api/backlog/:id/sprint + Bulk set_sprint).
// Beide Regeln sind Business-Invarianten (leben in lifecycle.js/api.js), NICHT in den
// Struktur-Schemas hier — dieses Modul dokumentiert sie nur.

import { z } from 'zod'

// Spiegel von server/lib/lifecycle.js ISSUE_STATUSES + den create-VALID_TYPES.
export const ISSUE_TYPES = ['bug', 'feature', 'improvement', 'core']
export const ISSUE_STATUSES = [
  'new', 'refined', 'planned', 'in_progress',
  'to_review', 'passed', 'rejected', 'completed', 'cancelled',
]
// Bei Anlage erlaubt der Backend nur new|refined (sonst 400) — der Rest folgt via Lifecycle.
export const ISSUE_CREATE_STATUSES = ['new', 'refined']

const typeEnum = z.enum(ISSUE_TYPES, { error: `type muss einer von ${ISSUE_TYPES.join('|')} sein` })
const prioritySchema = z.coerce.number().int().min(1).max(5)

// issue create — Struktur. title/type Pflicht; restliche Refinement-Felder optional/lenient
// (Business-Regeln in api.js). status auf create nur new|refined.
export const issueCreateContract = z.object({
  title: z.string({ error: 'title ist Pflichtfeld' }).trim().min(1, { error: 'title ist Pflichtfeld' }),
  type: typeEnum,
  priority: prioritySchema.optional(),
  status: z.enum(ISSUE_CREATE_STATUSES, { error: 'status bei Anlage darf nur new oder refined sein' }).optional(),
  milestone: z.string().nullish(),
  plugin_key: z.string().nullish(),
  goal: z.string().nullish(),
  background: z.string().nullish(),
  context_notes: z.string().nullish(),
  relevant_files: z.string().nullish(),
  po_notes: z.string().nullish(),
  files: z.array(z.string()).optional(),
  tag_ids: z.array(z.coerce.number().int().positive()).optional(),
  assigned_sprint: z.coerce.number().int().positive().nullish(),
  sprint_id: z.coerce.number().int().positive().nullish(),
})

// issue update — alle Felder optional; type-Enum wenn gesetzt; title nicht-leer wenn gesetzt.
export const issueUpdateContract = z.object({
  title: z.string().trim().min(1, { error: 'title darf nicht leer sein' }).optional(),
  type: typeEnum.optional(),
  priority: prioritySchema.optional(),
  milestone: z.string().nullish(),
  plugin_key: z.string().nullish(),
  goal: z.string().nullish(),
  background: z.string().nullish(),
  context_notes: z.string().nullish(),
  relevant_files: z.string().nullish(),
  po_notes: z.string().nullish(),
  files: z.array(z.string()).optional(),
})

// Status-Transition — status ∈ Lifecycle-Set; notes optional (Pflicht bei cancel via Lifecycle).
export const issueStatusContract = z.object({
  status: z.enum(ISSUE_STATUSES, { error: `status muss einer von ${ISSUE_STATUSES.join('|')} sein` }),
  notes: z.string().nullish(),
})

// Sprint-Zuordnung — sprint_id Zahl oder null (lösen).
export const issueAssignSprintContract = z.object({
  sprint_id: z.union([z.coerce.number().int().positive(), z.null()]),
})

// Tags — vollständige Ersetzung mit tag_ids.
export const issueTagsContract = z.object({
  tag_ids: z.array(z.coerce.number().int().positive()),
})

// Issue-Dependency — depends_on_id Pflicht, note optional.
export const issueDependencyContract = z.object({
  depends_on_id: z.coerce.number().int().positive(),
  note: z.string().nullish(),
})

// DD-621: Bulk-Operationen auf dem Backlog (PATCH /api/backlog/bulk).
// Spiegel der server/api.js-Inline-Actions. payload-Felder je nach action.
export const BULK_ACTIONS = ['set_status', 'set_sprint', 'cancel', 'soft_delete', 'add_tags', 'remove_tags']
export const backlogBulkContract = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, { error: 'ids required' }),
  action: z.enum(BULK_ACTIONS, { error: `action muss eine von ${BULK_ACTIONS.join('|')} sein` }),
  payload: z
    .object({
      status: z.string().optional(),
      sprint_id: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
      notes: z.string().optional(),
      tag_ids: z.array(z.coerce.number().int().positive()).optional(),
    })
    .optional(),
})

// DD-621: Issue in ein anderes Projekt verschieben (POST /api/backlog/:id/move).
export const backlogMoveContract = z.object({
  target_project_id: z.coerce.number().int().positive(),
})

/** @typedef {z.infer<typeof backlogBulkContract>} BacklogBulkInput */
/** @typedef {z.infer<typeof backlogMoveContract>} BacklogMoveInput */

/** @typedef {z.infer<typeof issueCreateContract>} IssueCreateInput */
/** @typedef {z.infer<typeof issueUpdateContract>} IssueUpdateInput */
/** @typedef {z.infer<typeof issueStatusContract>} IssueStatusInput */
/** @typedef {z.infer<typeof issueAssignSprintContract>} IssueAssignSprintInput */
/** @typedef {z.infer<typeof issueDependencyContract>} IssueDependencyInput */
