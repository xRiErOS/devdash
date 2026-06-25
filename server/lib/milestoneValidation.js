// DD-256 (T04 M02-S01): Validation für Milestone-Endpoints.
// 422 für target_date-Pflicht, 400 für name + status-Filter.
//
// DD-557 (Sprint DD#77): Payload-Validierung ist auf das autoritative Zod-Contract-Modul
// umgestellt (Voll-Umstellung-Verdict). validateMilestonePayload ist jetzt ein dünner
// REST-Adapter, der Contract-safeParse → die bestehende ValidationError(400, field)-Semantik
// mappt. Single Source = contracts/milestone-sprint.contracts.js; isBlank-Logik lebt nun
// in der Contract-name-Regel (z.string().trim().min(1)). resolveTargetDate/validateStatusFilter
// bleiben hier (REST-spezifisch, keine Payload-Triplikation).

import { milestoneCreateContract, milestoneUpdateContract } from '../../contracts/milestone-sprint.contracts.js'

export class ValidationError extends Error {
  constructor(field, message, statusCode = 422) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.statusCode = statusCode
  }
}

// Finding #2 + #3: target_date wird nicht mehr per 422 erzwungen — Backend füllt Default
// (date('now', '+90 days')) wenn fehlt oder explizit geleert. Schema bleibt NOT NULL,
// API garantiert immer einen Wert. Backward-Compat mit pre-T04 Clients und Clear-Semantics.
export function validateMilestonePayload(body, { operation } = {}) {
  let schema
  if (operation === 'create') schema = milestoneCreateContract
  else if (operation === 'update') schema = milestoneUpdateContract
  else throw new Error('validateMilestonePayload: operation must be create or update')

  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue?.path?.[0] != null ? String(issue.path[0]) : 'payload'
    const message = field === 'name'
      ? (operation === 'create' ? 'name ist Pflichtfeld' : 'name darf nicht leer sein')
      : (issue?.message || 'ungültige Payload')
    throw new ValidationError(field, message, 400)
  }
}

// Finding #2 + #3 + #4: zentrale Default-Berechnung — wird in api.js POST/PUT genutzt.
export function resolveTargetDate(value, { createdAt } = {}) {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  // Fallback: 90 Tage ab createdAt (falls vorhanden) oder ab jetzt.
  const base = createdAt ? new Date(createdAt) : new Date()
  const fallback = new Date(base.getTime() + 90 * 24 * 60 * 60 * 1000)
  return fallback.toISOString().slice(0, 10)
}

// DD-306 (2026-05-24): Filter-Werte erweitert um neuen Lifecycle (planning|active|completed|cancelled).
// 'open' bleibt als Backward-Compat-Alias erhalten und matcht (planning OR active) in der Query.
export const VALID_STATUS_FILTERS = new Set([
  'open',         // Alias für planning OR active (Backward-Compat)
  'planning',
  'active',
  'completed',
  'cancelled',
  'all',
])

export function validateStatusFilter(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return 'open'
  const v = String(rawValue)
  if (!VALID_STATUS_FILTERS.has(v)) {
    throw new ValidationError(
      'status',
      `status muss einer von [${[...VALID_STATUS_FILTERS].join(', ')}] sein`,
      400,
    )
  }
  return v
}

export function sendValidationError(res, err) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ error: err.message, field: err.field })
  }
  throw err
}
