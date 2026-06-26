// @ts-check
// DD-557 (Sprint DD#77, T01-Kern / T04-PoC): Autoritatives Zod-Contract-Modul
// für die Milestone-/Sprint-Tooling-Payloads. Single Source of Truth — alle 3
// Gateways leiten hieraus ab statt zu triplizieren (project_memory TS-CONTRACT-FIRST #264, D02):
//
//   - MCP  (mcp/devd-mcp.js)   : inputSchema = { project_id, ...<contract>.shape }
//   - CLI  (bin/devd-cli.js)   : parseOrThrow(<contract>, body)
//   - REST (server/api.js)     : <contract>.safeParse(req.body) (via milestoneValidation-Adapter)
//
// TS-Typen via z.infer (JSDoc, checkJs-ready für Folge-Track DD-559/T03).
// zod 4: z.toJSONSchema() wäre nativ verfügbar — der MCP-SDK nimmt das rohe
// Shape jedoch direkt, daher KEIN zod-to-json-schema nötig.

import { z } from 'zod'

// Milestone-Lifecycle-Stati — Spiegel von server/lib/lifecycle.js canMilestoneTransition
// (DD-306: planning|active|completed|cancelled). Legacy 'open'/'reached' bewusst NICHT
// hier — die werden nicht mehr geschrieben (nur Alt-Daten / Status-Filter-Alias).
export const MILESTONE_STATUSES = ['planning', 'active', 'completed', 'cancelled']

// name: nicht-leerer String. Lehnt '', '   ' (nach trim) und Nicht-Strings (0, false) ab
// — exakt die isBlank-Semantik von milestoneValidation.js (Finding #5).
const milestoneName = z.string().trim().min(1)

// description/target_date: optional, leerer String/null erlaubt (REST auto-defaulted
// target_date via resolveTargetDate, description-Whitespace → NULL). Bewusst lenient,
// damit der Contract bestehende REST-Caller nicht bricht (Voll-Umstellung, Bestand grün).
const optionalText = z.string().nullish()

// status bei create bewusst NICHT auf das Enum gepinnt — POST nutzt status||'planning',
// die Lifecycle-Validierung sitzt in patchMilestoneStatus. Enum-Pinning nur beim
// dedizierten Status-Verb (milestoneStatusContract).
export const milestoneCreateContract = z.object({
  name: milestoneName,
  description: optionalText,
  target_date: optionalText,
  status: z.string().nullish(),
})

export const milestoneUpdateContract = z.object({
  name: milestoneName.optional(),
  description: optionalText,
  target_date: optionalText,
})

// Dediziertes Status-Verb (DD-553): status auf Lifecycle-Enum gepinnt,
// cancellation_notes bei →cancelled (Pflicht im Lifecycle, hier optional durchgereicht).
export const milestoneStatusContract = z.object({
  status: z.enum(MILESTONE_STATUSES),
  cancellation_notes: z.string().nullish(),
})

// Milestone-Dependency (DD-556): predecessor → successor. coerce, da CLI Strings liefert.
export const milestoneDependencyContract = z.object({
  predecessor_id: z.coerce.number().int().positive(),
  successor_id: z.coerce.number().int().positive(),
})

// GF-2 Wave D / D2 (T01): Sprint-Dependency — 1:1-Mirror milestoneDependencyContract.
export const sprintDependencyContract = z.object({
  predecessor_id: z.coerce.number().int().positive(),
  successor_id: z.coerce.number().int().positive(),
})

// Sprint↔Milestone-Zuordnung (DD-552): milestone_id setzen oder lösen (null).
export const sprintSetMilestoneContract = z.object({
  milestone_id: z.union([z.coerce.number().int().positive(), z.null()]),
})

// ── DoD-Item-Payloads (D10, 2026-06-19) ───────────────────────────────────────
// details ist optional/nullable TEXT. label bleibt Pflichtfeld bei create.
// Leerer String für details ist erlaubt und wird serverseitig → NULL normalisiert.

export const dodItemCreateContract = z.object({
  label: z.string().trim().min(1, { message: 'label ist Pflichtfeld' }),
  details: z.string().nullish(),
})

export const dodItemUpdateContract = z.object({
  label: z.string().trim().min(1, { message: 'label darf nicht leer sein' }).optional(),
  done: z.union([z.boolean(), z.literal(0), z.literal(1), z.literal('0'), z.literal('1')]).optional(),
  details: z.string().nullable().optional(),
})

/** @typedef {z.infer<typeof dodItemCreateContract>} DodItemCreateInput */
/** @typedef {z.infer<typeof dodItemUpdateContract>} DodItemUpdateInput */

// ── Sprint-Payloads (DD-561, Sprint DD#78, Triplet 2/6) ───────────────────────
// Single Source der Sprint create/update/reorder-Struktur. Spiegel der REST-
// Validierung in server/api.js (POST/PUT /api/sprints, PATCH /api/sprints/reorder).
// Business-/Lifecycle-Regeln (canSprintTransition, DD-173 completed-Guard,
// DD-511 coerceSprintPosition, DD-552 milestone-project-match, Auto-Sync) bleiben
// in server/api.js + server/lib/lifecycle.js — hier nur Struktur/Typ/Required.

// Sprint-Lifecycle-Stati — Spiegel von server/lib/lifecycle.js SPRINT_STATUSES
// (planning|active|review|completed|closed|cancelled). Status-Übergänge selbst
// validiert canSprintTransition; das Enum dient Tooling/Doku + dedizierten Verben.
export const SPRINT_STATUSES = ['planning', 'active', 'review', 'completed', 'closed', 'cancelled']

// sprint create — name Pflicht (exakt 'name ist Pflichtfeld' wie POST /api/sprints).
// Restliche Felder optional/lenient (REST defaultet leere Werte → NULL). status bei
// create bewusst NICHT auf das Enum gepinnt — INSERT hardcodet 'planning'.
export const sprintCreateContract = z.object({
  name: z.string({ error: 'name ist Pflichtfeld' }).trim().min(1, { error: 'name ist Pflichtfeld' }),
  goal: z.string().nullish(),
  notes: z.string().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  capacity: z.coerce.number().int().nullish(),
  wip_limit: z.coerce.number().int().nullish(),
  milestone_id: z.coerce.number().int().positive().nullish(),
  status: z.string().nullish(),
})

// sprint update — alle Felder optional; name nicht-leer wenn gesetzt
// (exakt 'name darf nicht leer sein' wie PUT /api/sprints/:id). position lenient
// (coerceSprintPosition prüft serverseitig). status lenient (canSprintTransition prüft).
export const sprintUpdateContract = z.object({
  name: z.string().trim().min(1, { error: 'name darf nicht leer sein' }).optional(),
  goal: z.string().nullish(),
  notes: z.string().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  capacity: z.coerce.number().int().nullish(),
  wip_limit: z.coerce.number().int().nullish(),
  milestone_id: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  position: z.union([z.coerce.number(), z.null()]).optional(),
  status: z.string().nullish(),
})

// sprint reorder (DD-287) — Legacy-Format { ordered_ids: [int, ...] }.
// HINWEIS: Die REST-Route akzeptiert ZWEI Formate (ordered_ids ODER items[{id,position}])
// mit drei distinkten 400-Strings + Number()-Coercion-Semantik — diese nuancierte
// Validierung bleibt in server/api.js. Dieser Contract deckt nur die ordered_ids-Form.
export const sprintReorderContract = z.object({
  ordered_ids: z.array(z.coerce.number().int()),
})

// ── Read-/Response-Contracts (DD2 RoadmapBoard Phase 3) ───────────────────────
// Die obigen Contracts sind write-seitig (create/update/reorder). Der Connected-
// Wrapper des RoadmapBoard (apps/frontend/src/lib/roadmapApi.js) braucht zusätzlich
// Response-Schemata, um GET /api/milestones, /sprints?milestone_id=none und
// /milestones/:id/dependencies vor dem Durchreichen zu validieren (doc-promote-loop
// Phase 3: „Nie rohe API-Response durchreichen"). Bewusst LENIENT — zod-4-Objekte
// strippen unbekannte Keys still (kein Throw), nur die vom Board konsumierten Felder
// sind hier gepinnt. id-Felder coerce, da SQLite je nach Treiber String/Number liefert.

// Genesteter Sprint im Milestone-Listing bzw. flacher /api/sprints-Eintrag.
export const sprintReadContract = z.object({
  id: z.coerce.number().int(),
  key: z.string().nullish(),
  name: z.string().nullish(),
  status: z.string().nullish(),
  milestone_id: z.coerce.number().int().nullable().optional(),
  position: z.coerce.number().nullish(),
  issue_total: z.coerce.number().nullish(),
  issue_done: z.coerce.number().nullish(),
  issue_cancelled: z.coerce.number().nullish(),
  // G2: das flache GET /api/sprints liefert die Counts unter anderen Namen als
  // das genestete /api/milestones — beide Namensschemata zulassen, der Mapper
  // normalisiert auf issue_total/issue_done.
  item_count: z.coerce.number().nullish(),
  done_count: z.coerce.number().nullish(),
  issues: z.array(z.object({
    key: z.string().nullish(),
    title: z.string().nullish(),
    status: z.string().nullish(),
  })).nullish(),
})

// Ein Milestone aus GET /api/milestones (mit genesteten sprints[]).
export const milestoneReadContract = z.object({
  id: z.coerce.number().int(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  goal: z.string().nullish(),
  target_date: z.string().nullish(),
  status: z.string().nullish(),
  position: z.coerce.number().nullish(),
  deferred: z.coerce.number().nullish(),
  dod_total: z.coerce.number().nullish(),
  issue_total: z.coerce.number().nullish(),
  issue_done: z.coerce.number().nullish(),
  sprints: z.array(sprintReadContract).nullish(),
})

export const milestoneListReadContract = z.array(milestoneReadContract)

// Dependency-Response (G3): predecessor/successor Pflicht, id/dependency_id optional
// (Endpunkt-Shape unbestätigt — der Mapper normalisiert auf { id, predecessor_id, successor_id }).
export const milestoneDependencyReadContract = z.object({
  id: z.coerce.number().int().nullish(),
  dependency_id: z.coerce.number().int().nullish(),
  predecessor_id: z.coerce.number().int(),
  successor_id: z.coerce.number().int(),
})

export const milestoneDependencyListReadContract = z.array(milestoneDependencyReadContract)

export const sprintListReadContract = z.array(sprintReadContract)

/** @typedef {z.infer<typeof milestoneReadContract>} MilestoneRead */
/** @typedef {z.infer<typeof sprintReadContract>} SprintRead */
/** @typedef {z.infer<typeof milestoneDependencyReadContract>} MilestoneDependencyRead */

// CLI-Helper: parst gegen einen Contract und wirft einen lesbaren Fehler (statt Zod-Rohdump).
export function parseOrThrow(schema, data, label = 'input') {
  const r = schema.safeParse(data)
  if (!r.success) {
    const msgs = r.error.issues
      .map((i) => `${i.path.join('.') || label}: ${i.message}`)
      .join('; ')
    const err = /** @type {Error & { validation?: unknown }} */ (new Error(msgs))
    err.validation = r.error.issues
    throw err
  }
  return r.data
}

/** @typedef {z.infer<typeof milestoneCreateContract>} MilestoneCreateInput */
/** @typedef {z.infer<typeof milestoneUpdateContract>} MilestoneUpdateInput */
/** @typedef {z.infer<typeof milestoneStatusContract>} MilestoneStatusInput */
/** @typedef {z.infer<typeof milestoneDependencyContract>} MilestoneDependencyInput */
/** @typedef {z.infer<typeof sprintSetMilestoneContract>} SprintSetMilestoneInput */
/** @typedef {z.infer<typeof sprintCreateContract>} SprintCreateInput */
/** @typedef {z.infer<typeof sprintUpdateContract>} SprintUpdateInput */
/** @typedef {z.infer<typeof sprintReorderContract>} SprintReorderInput */
