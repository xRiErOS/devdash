import { describe, test, expect } from 'vitest'
import {
  SPRINT_STATUSES,
  sprintCreateContract,
  sprintUpdateContract,
  sprintReorderContract,
} from '../../contracts/milestone-sprint.contracts.js'

// DD-561 (Sprint DD#78, Triplet 2/6): Contract spiegelt die REST-Struktur-
// Validierung von POST/PUT /api/sprints + PATCH /api/sprints/reorder (ordered_ids-Form).
// Business-/Lifecycle-Regeln bleiben in server/api.js + server/lib/lifecycle.js.

describe('DD-561 SPRINT_STATUSES', () => {
  test('Spiegel von lifecycle.js SPRINT_STATUSES', () => {
    expect(SPRINT_STATUSES).toEqual([
      'planning', 'active', 'review', 'completed', 'closed', 'cancelled',
    ])
  })
})

describe('DD-561 sprintCreateContract', () => {
  test('valid minimal', () => {
    expect(sprintCreateContract.safeParse({ name: 'Sprint X' }).success).toBe(true)
  })
  test('name Pflicht (Message exakt wie REST)', () => {
    const r = sprintCreateContract.safeParse({})
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('name ist Pflichtfeld')
  })
  test('leerer/whitespace name → Pflicht (Message)', () => {
    const r = sprintCreateContract.safeParse({ name: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('name ist Pflichtfeld')
  })
  test('optionale Felder erlaubt', () => {
    expect(sprintCreateContract.safeParse({
      name: 'S', goal: 'g', notes: 'n', start_date: '2026-01-01',
      end_date: '2026-02-01', capacity: 10, wip_limit: 3, milestone_id: 5, status: 'planning',
    }).success).toBe(true)
  })
  test('capacity/wip_limit coerce aus String', () => {
    const r = sprintCreateContract.safeParse({ name: 'S', capacity: '10', wip_limit: '2' })
    expect(r.success).toBe(true)
    expect(r.data.capacity).toBe(10)
    expect(r.data.wip_limit).toBe(2)
  })
  test('milestone_id coerce + positiv', () => {
    expect(sprintCreateContract.safeParse({ name: 'S', milestone_id: '7' }).success).toBe(true)
    expect(sprintCreateContract.safeParse({ name: 'S', milestone_id: -1 }).success).toBe(false)
  })
  test('null-Werte für optionale Felder erlaubt (REST → NULL)', () => {
    expect(sprintCreateContract.safeParse({ name: 'S', goal: null, notes: null }).success).toBe(true)
  })
})

describe('DD-561 sprintUpdateContract', () => {
  test('leerer Body OK', () => {
    expect(sprintUpdateContract.safeParse({}).success).toBe(true)
  })
  test('name leer → Message exakt wie REST', () => {
    const r = sprintUpdateContract.safeParse({ name: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('name darf nicht leer sein')
  })
  test('milestone_id null erlaubt (lösen)', () => {
    expect(sprintUpdateContract.safeParse({ milestone_id: null }).success).toBe(true)
    expect(sprintUpdateContract.safeParse({ milestone_id: 4 }).success).toBe(true)
  })
  test('position Zahl|null (coerceSprintPosition prüft serverseitig)', () => {
    expect(sprintUpdateContract.safeParse({ position: 3 }).success).toBe(true)
    expect(sprintUpdateContract.safeParse({ position: null }).success).toBe(true)
    expect(sprintUpdateContract.safeParse({ position: '3.5' }).success).toBe(true)
  })
  test('status lenient (Lifecycle prüft Übergang)', () => {
    expect(sprintUpdateContract.safeParse({ status: 'active' }).success).toBe(true)
  })
})

describe('DD-561 sprintReorderContract', () => {
  test('ordered_ids Array von Ints', () => {
    expect(sprintReorderContract.safeParse({ ordered_ids: [1, 2, 3] }).success).toBe(true)
    expect(sprintReorderContract.safeParse({ ordered_ids: ['1', '2'] }).success).toBe(true)
  })
  test('ordered_ids Pflicht', () => {
    expect(sprintReorderContract.safeParse({}).success).toBe(false)
  })
})
