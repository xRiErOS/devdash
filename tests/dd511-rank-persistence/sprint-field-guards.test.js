// DD-511 (I02) — Unit tests for coerceSprintPosition helper.
// Pure function tests — no DB, no Express app required.

import { describe, test, expect } from 'vitest'
import { coerceSprintPosition } from '../../server/lib/sprintFieldGuards.js'

describe('coerceSprintPosition — NULL sentinel cases', () => {
  test('null → { ok: true, value: null }', () => {
    expect(coerceSprintPosition(null)).toEqual({ ok: true, value: null })
  })

  test('undefined → { ok: true, value: null }', () => {
    expect(coerceSprintPosition(undefined)).toEqual({ ok: true, value: null })
  })

  test("'' → { ok: true, value: null }", () => {
    expect(coerceSprintPosition('')).toEqual({ ok: true, value: null })
  })

  test("'  ' (whitespace) → { ok: true, value: null } (not 0)", () => {
    // Number('  ') === 0 which is finite, so without the trim-check it would
    // silently store 0 instead of treating it as the clear/unranked case.
    expect(coerceSprintPosition('  ')).toEqual({ ok: true, value: null })
  })
})

describe('coerceSprintPosition — valid numeric cases', () => {
  test('integer 3 → { ok: true, value: 3 }', () => {
    expect(coerceSprintPosition(3)).toEqual({ ok: true, value: 3 })
  })

  test("string '3' → { ok: true, value: 3 }", () => {
    expect(coerceSprintPosition('3')).toEqual({ ok: true, value: 3 })
  })

  test('0 → { ok: true, value: 0 } (zero is a valid position)', () => {
    expect(coerceSprintPosition(0)).toEqual({ ok: true, value: 0 })
  })

  test("'3.5' → { ok: true, value: 3.5 } (float coerced, not stored as string)", () => {
    expect(coerceSprintPosition('3.5')).toEqual({ ok: true, value: 3.5 })
  })

  test('negative position allowed (e.g. prepend before index 0)', () => {
    expect(coerceSprintPosition(-1)).toEqual({ ok: true, value: -1 })
  })
})

describe('coerceSprintPosition — invalid / non-finite cases', () => {
  test('NaN → { ok: false }', () => {
    const r = coerceSprintPosition(NaN)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('position muss eine endliche Zahl sein')
  })

  test('Infinity → { ok: false }', () => {
    const r = coerceSprintPosition(Infinity)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('position muss eine endliche Zahl sein')
  })

  test('-Infinity → { ok: false }', () => {
    const r = coerceSprintPosition(-Infinity)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('position muss eine endliche Zahl sein')
  })

  test("'abc' → { ok: false }", () => {
    const r = coerceSprintPosition('abc')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('position muss eine endliche Zahl sein')
  })
})
