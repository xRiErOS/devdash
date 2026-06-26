import { describe, test, expect, vi } from 'vitest'
import {
  toBoardData,
  mapMilestone,
  mapSprint,
  mapDep,
  dedupeDeps,
  normalizeDependencyResponse,
} from '../../apps/frontend/src/lib/roadmapApi.js'

// DD2 RoadmapBoard Phase 3 (Connected): der lib-Adapter validiert die Backend-
// Response gegen die Read-Contracts und mappt auf die presentational Board-Props.
// Reiner Mapping-/Fallback-Test (kein Fetch) — TDD-Netz für G1/G2/G3.

const MILESTONE = {
  id: 3, name: 'Roadmap & Planung',
  description: 'Board + Planung', target_date: '2026-09-01', status: 'planning',
  position: 2, dod_total: 5,
  sprints: [
    { id: 106, key: 'DD2#52', name: 'Mockup', status: 'active', milestone_id: 3, position: 0, issue_total: 9, issue_done: 0, issue_cancelled: 0 },
  ],
}

describe('mapMilestone (G1: goal ?? description)', () => {
  test('füllt goal aus description, wenn goal fehlt', () => {
    expect(mapMilestone(MILESTONE).goal).toBe('Board + Planung')
  })
  test('echtes goal hat Vorrang vor description', () => {
    expect(mapMilestone({ ...MILESTONE, goal: 'Echtes Ziel' }).goal).toBe('Echtes Ziel')
  })
  test('reicht position/target_date/dod_total/status durch', () => {
    const m = mapMilestone(MILESTONE)
    expect(m).toMatchObject({ id: 3, position: 2, target_date: '2026-09-01', dod_total: 5, status: 'planning' })
  })
  test('nested sprints werden gemappt', () => {
    expect(mapMilestone(MILESTONE).sprints[0]).toMatchObject({ id: 106, milestone_id: 3, issue_total: 9 })
  })
})

describe('mapSprint (G2: Count-Normalisierung)', () => {
  test('genestete Counts (issue_total/issue_done) durchreichen', () => {
    const s = mapSprint({ id: 1, issue_total: 6, issue_done: 4 })
    expect(s).toMatchObject({ issue_total: 6, issue_done: 4 })
  })
  test('flache Counts (item_count/done_count) → issue_total/issue_done', () => {
    const s = mapSprint({ id: 2, item_count: 5, done_count: 2 })
    expect(s).toMatchObject({ issue_total: 5, issue_done: 2 })
  })
  test('genestete Namen gewinnen, wenn beide gesetzt', () => {
    const s = mapSprint({ id: 3, issue_total: 6, item_count: 99 })
    expect(s.issue_total).toBe(6)
  })
})

describe('mapDep (G3: id-Normalisierung)', () => {
  test('behält id, predecessor_id, successor_id', () => {
    expect(mapDep({ id: 7, predecessor_id: 1, successor_id: 2 }, 0)).toEqual({ id: 7, predecessor_id: 1, successor_id: 2 })
  })
  test('fällt auf dependency_id zurück, wenn id fehlt', () => {
    expect(mapDep({ dependency_id: 9, predecessor_id: 1, successor_id: 2 }, 0).id).toBe(9)
  })
  test('synthetische id, wenn beide fehlen', () => {
    expect(mapDep({ predecessor_id: 1, successor_id: 2 }, 4).id).toBe(5)
  })
})

describe('normalizeDependencyResponse (G3: Live-Shape { predecessors, successors })', () => {
  test('projiziert successors zu Vorgänger→Nachfolger-Kanten', () => {
    const resp = {
      predecessors: [],
      successors: [{ id: 39, name: 'M7', dependency_id: 3 }],
    }
    expect(normalizeDependencyResponse(38, resp)).toEqual([
      { id: 3, predecessor_id: 38, successor_id: 39 },
    ])
  })
  test('ignoriert predecessors (Kante kommt über den Vorgänger genau einmal)', () => {
    const resp = { predecessors: [{ id: 38, dependency_id: 3 }], successors: [] }
    expect(normalizeDependencyResponse(39, resp)).toEqual([])
  })
  test('Fallback auf flaches Array (Legacy/Fixture)', () => {
    const flat = [{ id: 1, predecessor_id: 1, successor_id: 2 }]
    expect(normalizeDependencyResponse(1, flat)).toEqual([{ id: 1, predecessor_id: 1, successor_id: 2 }])
  })
  test('leere/unbekannte Response → []', () => {
    expect(normalizeDependencyResponse(1, null)).toEqual([])
    expect(normalizeDependencyResponse(1, {})).toEqual([])
  })
  test('Aggregation über zwei Milestones ergibt beide Kanten (via flatMap im Aufrufer)', () => {
    const a = normalizeDependencyResponse(1, { successors: [{ id: 2, dependency_id: 10 }] })
    const b = normalizeDependencyResponse(2, { successors: [{ id: 3, dependency_id: 11 }] })
    expect(dedupeDeps([...a, ...b])).toEqual([
      { id: 10, predecessor_id: 1, successor_id: 2 },
      { id: 11, predecessor_id: 2, successor_id: 3 },
    ])
  })
})

describe('dedupeDeps', () => {
  test('entfernt doppelte predecessor→successor-Kanten', () => {
    const out = dedupeDeps([
      { id: 1, predecessor_id: 1, successor_id: 2 },
      { id: 2, predecessor_id: 1, successor_id: 2 },
      { id: 3, predecessor_id: 2, successor_id: 3 },
    ])
    expect(out).toHaveLength(2)
  })
})

describe('toBoardData (Zod-validiert)', () => {
  test('liefert { milestones, deps, unassignedSprints }', () => {
    const out = toBoardData({
      milestones: [MILESTONE],
      deps: [{ id: 1, predecessor_id: 1, successor_id: 2 }],
      unassigned: [{ id: 108, name: 'lose', status: 'planning', milestone_id: null, item_count: 4, done_count: 0 }],
    })
    expect(out.milestones).toHaveLength(1)
    expect(out.deps).toEqual([{ id: 1, predecessor_id: 1, successor_id: 2 }])
    expect(out.unassignedSprints[0]).toMatchObject({ id: 108, milestone_id: null, issue_total: 4 })
  })

  test('erzwingt milestone_id=null für unassigned', () => {
    const out = toBoardData({ milestones: [], deps: [], unassigned: [{ id: 5, milestone_id: 99 }] })
    expect(out.unassignedSprints[0].milestone_id).toBeNull()
  })

  test('Zod-Fallback: kaputte milestones-Response → [] statt Throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = toBoardData({ milestones: { not: 'an array' }, deps: null, unassigned: undefined })
    expect(out).toEqual({ milestones: [], deps: [], unassignedSprints: [] })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  test('Zod-Fallback: einzelner Milestone ohne id → ganze Liste verworfen, kein Throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = toBoardData({ milestones: [{ name: 'kein id' }], deps: [], unassigned: [] })
    expect(out.milestones).toEqual([])
    warn.mockRestore()
  })
})
