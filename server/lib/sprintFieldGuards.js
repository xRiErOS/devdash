// Sprint-field validation helpers — pure functions, no DB access.
// Exported so unit tests can exercise them without booting the Express app.

/**
 * Coerce and validate the `position` value from a PUT /api/sprints/:id body.
 *
 * Semantics:
 *   - null / undefined / '' / whitespace-only  → { ok: true, value: null }
 *     Whitespace is treated as "clear / unranked" — storing 0 silently would be wrong.
 *   - finite number or numeric string           → { ok: true, value: Number(value) }
 *   - NaN / ±Infinity / non-numeric string      → { ok: false, error: '...' }
 *
 * @param {unknown} value - Raw value from req.body.position
 * @returns {{ ok: true, value: number|null } | { ok: false, error: string }}
 */
export function coerceSprintPosition(value) {
  // NULL sentinel: clear / unranked path
  if (value == null || value === '') {
    return { ok: true, value: null }
  }

  // Whitespace-only strings are treated as the clear/unranked case, not as 0.
  if (typeof value === 'string' && value.trim() === '') {
    return { ok: true, value: null }
  }

  const coerced = Number(value)
  if (!Number.isFinite(coerced)) {
    return { ok: false, error: 'position muss eine endliche Zahl sein' }
  }

  return { ok: true, value: coerced }
}
