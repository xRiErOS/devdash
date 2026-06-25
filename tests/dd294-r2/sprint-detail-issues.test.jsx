// DD-509 — Repoint von DD-294-R2 auf die neue Sprint-Details-Helper-Schicht.
//
// Die alte Sprint-Detail-View fuhr Status-TABS + Type-Gruppierung
// (groupByType/computeCounts/filterByTab). Mit dem Neubau aus der kanonischen
// SOLL-Story (Screens/Sprint-Details, DD-502) ersetzt eine flache, sortier- und
// filterbare Liste die Tabs/Gruppierung. Diese Tests charakterisieren die neuen
// pure-Helper sortIssues/filterIssues/countDone/activeFilterCount.
//
// Bug-Kontext (historisch, weiter abgesichert): type='core' (gültig im DB-Enum)
// darf nicht aus der Liste verschwinden — der Typ-Filter/Sort kennt 'core'.

import { describe, test, expect } from 'vitest'
import {
  DONE_STATUSES,
  SORT_OPTIONS,
  TYPE_OPTIONS,
  STATUS_OPTIONS,
  DEFAULT_FILTERS,
  sortIssues,
  filterIssues,
  countDone,
  activeFilterCount,
  nextStatus,
} from '../../src/views/sprintDetailHelpers.js'

const ISSUES = [
  { id: 1, rank: 1, type: 'feature', status: 'in_progress', priority: 2 },
  { id: 2, rank: 2, type: 'feature', status: 'planned', priority: 2 },
  { id: 3, rank: 3, type: 'improvement', status: 'to_review', priority: 3 },
  { id: 4, rank: 4, type: 'improvement', status: 'planned', priority: 3 },
  { id: 5, rank: 5, type: 'improvement', status: 'passed', priority: 3 },
  { id: 6, rank: 6, type: 'core', status: 'done', priority: 1 },
  { id: 7, rank: 7, type: 'core', status: 'done', priority: 2 },
  { id: 8, rank: 8, type: 'core', status: 'passed', priority: 2 },
  { id: 9, rank: 9, type: 'bug', status: 'done', priority: 2 },
]

describe('DD-509 · Optionen + Defaults', () => {
  test('DONE_STATUSES = passed + done', () => {
    expect(DONE_STATUSES).toEqual(expect.arrayContaining(['passed', 'done']))
  })

  test('DEFAULT_FILTERS blendet erledigte aus (status=open)', () => {
    expect(DEFAULT_FILTERS).toEqual({ status: 'open', type: 'all', priority: 'all' })
  })

  test('Optionslisten existieren', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['rank', 'priority', 'type', 'status'])
    expect(TYPE_OPTIONS.map((o) => o.value)).toContain('core')
    expect(STATUS_OPTIONS.map((o) => o.value)).toContain('open')
  })
})

describe('DD-509 · sortIssues', () => {
  test('rank: natürliche Reihenfolge', () => {
    const sorted = sortIssues(ISSUES, 'rank')
    expect(sorted.map((i) => i.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  test('priority: P1 zuerst', () => {
    const sorted = sortIssues(ISSUES, 'priority')
    expect(sorted[0].priority).toBe(1)
  })

  test('type: feature → improvement → bug → core (TYPE_OPTIONS-Reihenfolge)', () => {
    const sorted = sortIssues(ISSUES, 'type')
    const order = sorted.map((i) => i.type)
    expect(order.indexOf('feature')).toBeLessThan(order.indexOf('improvement'))
    expect(order.indexOf('improvement')).toBeLessThan(order.indexOf('bug'))
    expect(order.indexOf('bug')).toBeLessThan(order.indexOf('core'))
  })

  test('type="core" verschwindet NICHT (historische Bug-Repro)', () => {
    const sorted = sortIssues(ISSUES, 'type')
    expect(sorted.filter((i) => i.type === 'core')).toHaveLength(3)
  })

  test('status: alphabetisch', () => {
    const sorted = sortIssues(ISSUES, 'status')
    const statuses = sorted.map((i) => i.status)
    const expected = [...statuses].sort((a, b) => a.localeCompare(b))
    expect(statuses).toEqual(expected)
  })

  test('mutiert die Eingabe nicht', () => {
    const copy = ISSUES.map((i) => ({ ...i }))
    sortIssues(ISSUES, 'priority')
    expect(ISSUES).toEqual(copy)
  })

  test('leeres/null Input → leeres Array', () => {
    expect(sortIssues([], 'rank')).toEqual([])
    expect(sortIssues(null, 'rank')).toEqual([])
  })
})

describe('DD-509 · filterIssues', () => {
  test('status=open blendet passed/done aus (Default)', () => {
    const visible = filterIssues(ISSUES, DEFAULT_FILTERS)
    expect(visible.map((i) => i.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
  })

  test('status=done zeigt nur erledigte', () => {
    const visible = filterIssues(ISSUES, { status: 'done', type: 'all', priority: 'all' })
    expect(visible.map((i) => i.id).sort((a, b) => a - b)).toEqual([5, 6, 7, 8, 9])
  })

  test('status=all zeigt alle', () => {
    expect(filterIssues(ISSUES, { status: 'all', type: 'all', priority: 'all' })).toHaveLength(9)
  })

  test('exakter Status-Match (in_progress)', () => {
    const visible = filterIssues(ISSUES, { status: 'in_progress', type: 'all', priority: 'all' })
    expect(visible.map((i) => i.id)).toEqual([1])
  })

  test('type-Filter (core)', () => {
    const visible = filterIssues(ISSUES, { status: 'all', type: 'core', priority: 'all' })
    expect(visible.map((i) => i.id).sort((a, b) => a - b)).toEqual([6, 7, 8])
  })

  test('priority-Filter (P3)', () => {
    const visible = filterIssues(ISSUES, { status: 'all', type: 'all', priority: '3' })
    expect(visible.map((i) => i.id).sort((a, b) => a - b)).toEqual([3, 4, 5])
  })

  test('kombinierter Filter (open + improvement)', () => {
    const visible = filterIssues(ISSUES, { status: 'open', type: 'improvement', priority: 'all' })
    expect(visible.map((i) => i.id).sort((a, b) => a - b)).toEqual([3, 4])
  })

  test('leeres/null Input → leeres Array', () => {
    expect(filterIssues(null, DEFAULT_FILTERS)).toEqual([])
  })
})

describe('DD-509 · countDone', () => {
  test('zählt passed + done', () => {
    expect(countDone(ISSUES)).toBe(5)
  })

  test('leeres/null → 0', () => {
    expect(countDone([])).toBe(0)
    expect(countDone(null)).toBe(0)
  })
})

describe('DD-509 · nextStatus (safe forward-only advance)', () => {
  test('planned → in_progress', () => {
    expect(nextStatus('planned')).toBe('in_progress')
  })

  test('in_progress → to_review', () => {
    expect(nextStatus('in_progress')).toBe('to_review')
  })

  test('to_review → null (no further forward step)', () => {
    expect(nextStatus('to_review')).toBeNull()
  })

  test('done → null (no destructive revert)', () => {
    expect(nextStatus('done')).toBeNull()
  })

  test('passed → null (no destructive revert)', () => {
    expect(nextStatus('passed')).toBeNull()
  })

  test('rejected → null', () => {
    expect(nextStatus('rejected')).toBeNull()
  })

  test('cancelled → null', () => {
    expect(nextStatus('cancelled')).toBeNull()
  })

  test('new → null (unmapped, no jump)', () => {
    expect(nextStatus('new')).toBeNull()
  })

  test('refined → null (unmapped, no jump)', () => {
    expect(nextStatus('refined')).toBeNull()
  })

  test('undefined → null', () => {
    expect(nextStatus(undefined)).toBeNull()
  })
})

describe('DD-509 · activeFilterCount', () => {
  test('Default (open/all/all) → 1 (status weicht von all ab)', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(1)
  })

  test('alle all → 0', () => {
    expect(activeFilterCount({ status: 'all', type: 'all', priority: 'all' })).toBe(0)
  })

  test('drei aktive Filter → 3', () => {
    expect(activeFilterCount({ status: 'done', type: 'core', priority: '2' })).toBe(3)
  })
})
