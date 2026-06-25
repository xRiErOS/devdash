// DD-313 / DD-45 D30 — description ist soft-deprecated im Sinne von
// "Spalte bleibt erhalten, kein DROP COLUMN". PO-Decision D30 (2026-05-24)
// revidiert die alte Interpretation, dass das Feld in Responses verschwiegen
// wird. description bleibt fuer Capture/UI/CLI sichtbar und befuellbar.

import { describe, expect, test } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { sanitizeDeprecatedDescription, sanitizeDeprecatedDescriptions } from '../../server/lib/issueDescription.js'

const MIGRATIONS_DIR = resolve('migrations')

describe('DD-313 / DD-45 D30 — description soft-deprecation', () => {
  test('migration 036 is an audit-trail NoOp and does not drop description', () => {
    // DD-306: kein slice(-1)-Anchor mehr — robust gegen neue Migrations.
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    expect(files).toContain('036_v3_description_soft_deprecated.sql')
    const sql = readFileSync(join(MIGRATIONS_DIR, '036_v3_description_soft_deprecated.sql'), 'utf8')
    expect(sql).toMatch(/soft-deprecation/i)
    expect(sql).not.toMatch(/DROP\s+COLUMN/i)
    expect(sql).not.toMatch(/UPDATE\s+backlog/i)
  })

  test('sanitizer is an identity passthrough — description value is preserved (D30)', () => {
    const raw = { id: 1, title: 'Legacy issue', description: 'legacy backup text', goal: 'Current goal' }
    const sanitized = sanitizeDeprecatedDescription(raw)
    expect(sanitized).toEqual({ id: 1, title: 'Legacy issue', description: 'legacy backup text', goal: 'Current goal' })
    expect(raw.description).toBe('legacy backup text')
  })

  test('list sanitizer preserves rows including description (D30)', () => {
    expect(sanitizeDeprecatedDescriptions([
      { id: 1, description: 'legacy' },
      { id: 2, title: 'No projection' },
    ])).toEqual([
      { id: 1, description: 'legacy' },
      { id: 2, title: 'No projection' },
    ])
  })

  test('sanitizer handles null/undefined rows safely', () => {
    expect(sanitizeDeprecatedDescription(null)).toBe(null)
    expect(sanitizeDeprecatedDescription(undefined)).toBe(undefined)
  })
})
