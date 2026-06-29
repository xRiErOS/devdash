import { describe, test, expect } from 'vitest'
import {
  MILESTONE_STATUSES,
  milestoneCreateContract,
  milestoneUpdateContract,
  milestoneStatusContract,
  milestoneDependencyContract,
  sprintSetMilestoneContract,
  parseOrThrow,
} from '@devd/api-types/milestone-sprint.contracts.js'

// DD-557: der Contract ist Single-Source — diese Tests sichern die Semantik, die
// milestoneValidation.js (Bestand, t04-api-milestones-validation.test.js) weiter erfüllen muss.

describe('DD-557 milestoneCreateContract', () => {
  test('Erfolg bei Name + target_date', () => {
    expect(milestoneCreateContract.safeParse({ name: 'M-X', target_date: '2026-12-31' }).success).toBe(true)
  })
  test('name fehlt → invalid, path=name', () => {
    const r = milestoneCreateContract.safeParse({ target_date: '2026-12-31' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].path[0]).toBe('name')
  })
  test('name=0 (Number) → invalid', () => {
    const r = milestoneCreateContract.safeParse({ name: 0 })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].path[0]).toBe('name')
  })
  test('name=false → invalid', () => {
    const r = milestoneCreateContract.safeParse({ name: false })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].path[0]).toBe('name')
  })
  test('target_date OPTIONAL: fehlend / leer / whitespace akzeptiert', () => {
    expect(milestoneCreateContract.safeParse({ name: 'M-X' }).success).toBe(true)
    expect(milestoneCreateContract.safeParse({ name: 'M-X', target_date: '' }).success).toBe(true)
    expect(milestoneCreateContract.safeParse({ name: 'M-X', target_date: '   ' }).success).toBe(true)
  })
  test('status frei (nicht enum-gepinnt) bei create — Legacy open akzeptiert', () => {
    expect(milestoneCreateContract.safeParse({ name: 'M-X', status: 'open' }).success).toBe(true)
  })
})

describe('DD-557 milestoneUpdateContract', () => {
  test('leerer Body OK', () => {
    expect(milestoneUpdateContract.safeParse({}).success).toBe(true)
  })
  test('description ohne name OK', () => {
    expect(milestoneUpdateContract.safeParse({ description: 'updated' }).success).toBe(true)
  })
  test("target_date='' und null akzeptiert", () => {
    expect(milestoneUpdateContract.safeParse({ target_date: '' }).success).toBe(true)
    expect(milestoneUpdateContract.safeParse({ target_date: null }).success).toBe(true)
  })
  test('name auf leer (whitespace) → invalid, path=name', () => {
    const r = milestoneUpdateContract.safeParse({ name: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].path[0]).toBe('name')
  })
})

describe('DD-557 milestoneStatusContract', () => {
  test('alle Lifecycle-Stati gültig', () => {
    for (const s of MILESTONE_STATUSES) {
      expect(milestoneStatusContract.safeParse({ status: s }).success).toBe(true)
    }
  })
  test('unbekannter Status → invalid', () => {
    expect(milestoneStatusContract.safeParse({ status: 'reached' }).success).toBe(false)
  })
})

describe('DD-557 milestoneDependencyContract', () => {
  test('numerische IDs (auch als String coerced)', () => {
    expect(milestoneDependencyContract.safeParse({ predecessor_id: 1, successor_id: 2 }).success).toBe(true)
    expect(milestoneDependencyContract.safeParse({ predecessor_id: '1', successor_id: '2' }).success).toBe(true)
  })
  test('fehlende ID → invalid', () => {
    expect(milestoneDependencyContract.safeParse({ predecessor_id: 1 }).success).toBe(false)
  })
})

describe('DD-557 sprintSetMilestoneContract', () => {
  test('milestone_id Zahl ODER null', () => {
    expect(sprintSetMilestoneContract.safeParse({ milestone_id: 5 }).success).toBe(true)
    expect(sprintSetMilestoneContract.safeParse({ milestone_id: null }).success).toBe(true)
    expect(sprintSetMilestoneContract.safeParse({ milestone_id: '5' }).success).toBe(true)
  })
})

describe('DD-557 parseOrThrow', () => {
  test('gibt geparste Daten bei Erfolg', () => {
    const out = parseOrThrow(milestoneStatusContract, { status: 'in_progress' })
    expect(out.status).toBe('in_progress')
  })
  test('wirft lesbaren Fehler mit Pfad', () => {
    expect(() => parseOrThrow(milestoneCreateContract, {})).toThrow(/name/)
  })
})
