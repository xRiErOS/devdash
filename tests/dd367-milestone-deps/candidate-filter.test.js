// DD-367 — Unit-Tests für die pure Kandidaten-Filter-Logik des
// MilestoneDependencyEditor. Der React-Editor selbst ist in environment node
// nicht renderbar; die API-Cycle-Detection ist in
// tests/m02-s01/t05-api-dependencies-cycle.test.js abgedeckt (nicht dupliziert).

import { describe, test, expect } from 'vitest'
import { availableCandidates } from '../../src/components/ui/molecules/MilestoneDependencyEditor.jsx'

const ALL = [
  { id: 1, name: 'M1' },
  { id: 2, name: 'M2' },
  { id: 3, name: 'M3' },
  { id: 4, name: 'M4' },
]

describe('DD-367 — availableCandidates', () => {
  test('schließt den eigenen Milestone aus', () => {
    const out = availableCandidates(ALL, 2, [])
    expect(out.map(m => m.id)).toEqual([1, 3, 4])
  })

  test('schließt bereits verknüpfte (excludeIds als Array) aus', () => {
    const out = availableCandidates(ALL, 1, [3])
    expect(out.map(m => m.id)).toEqual([2, 4])
  })

  test('akzeptiert ein Set als excludeIds', () => {
    const out = availableCandidates(ALL, 1, new Set([2, 4]))
    expect(out.map(m => m.id)).toEqual([3])
  })

  test('gibt den Rest zurück, wenn nichts ausgeschlossen ist (außer self)', () => {
    const out = availableCandidates(ALL, 99, [])
    expect(out.map(m => m.id)).toEqual([1, 2, 3, 4])
  })

  test('robust gegen leere Liste', () => {
    expect(availableCandidates([], 1, [])).toEqual([])
  })

  test('robust gegen null/undefined allMilestones', () => {
    expect(availableCandidates(null, 1, [])).toEqual([])
    expect(availableCandidates(undefined, 1, [])).toEqual([])
  })

  test('robust gegen null/undefined excludeIds', () => {
    expect(availableCandidates(ALL, 2, null).map(m => m.id)).toEqual([1, 3, 4])
    expect(availableCandidates(ALL, 2, undefined).map(m => m.id)).toEqual([1, 3, 4])
  })

  test('robust gegen null-Einträge in der Milestone-Liste', () => {
    const withNull = [{ id: 1, name: 'M1' }, null, { id: 2, name: 'M2' }]
    expect(availableCandidates(withNull, 1, []).map(m => m.id)).toEqual([2])
  })

  test('self-exclude und excludeIds kombiniert', () => {
    const out = availableCandidates(ALL, 1, [2])
    expect(out.map(m => m.id)).toEqual([3, 4])
  })
})
