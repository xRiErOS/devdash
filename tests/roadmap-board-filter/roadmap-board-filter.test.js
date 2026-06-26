// RoadmapBoard — Such-Filter (reine Logik, Node-Env, kein DOM).
// Deckt filterRoadmap aus src/lib/roadmapBoardFilter.js: Eigen-Treffer,
// Sprint-Treffer (mit Sprint-Reduktion), Unassigned, leere Query.

import { describe, test, expect } from 'vitest'
import { filterRoadmap } from '../../apps/frontend/src/lib/roadmapBoardFilter.js'

const DATA = {
  milestones: [
    {
      id: 1, name: 'Fundament & Tokens', sprints: [
        { id: 101, key: 'DD2#41', name: 'Token-Layer härten', status: 'active' },
        { id: 102, key: 'DD2#42', name: 'Render-Smoke-Netz', status: 'review' },
      ],
    },
    {
      id: 2, name: 'ElementBrowser-Reihe', sprints: [
        { id: 104, key: 'DD2#49', name: 'Browser-Organismus', status: 'active' },
      ],
    },
  ],
  unassignedSprints: [
    { id: 108, key: 'DD2#51', name: 'Connected-Wrapper', status: 'planning' },
    { id: 109, key: 'DD2#53', name: 'Dependency-Graph', status: 'planning' },
  ],
}

describe('leere Query', () => {
  test('leerer String → Eingabe unverändert', () => {
    const out = filterRoadmap(DATA, '')
    expect(out.milestones).toBe(DATA.milestones)
    expect(out.unassignedSprints).toBe(DATA.unassignedSprints)
  })
  test('reine Whitespace-Query → Eingabe unverändert', () => {
    const out = filterRoadmap(DATA, '   ')
    expect(out.milestones).toBe(DATA.milestones)
  })
})

describe('Meilenstein-Eigen-Treffer', () => {
  test('Name-Treffer zeigt Spalte mit ALLEN Sprints', () => {
    const out = filterRoadmap(DATA, 'fundament')
    expect(out.milestones).toHaveLength(1)
    expect(out.milestones[0].id).toBe(1)
    expect(out.milestones[0].sprints).toHaveLength(2)
  })
  test('M-Key-Treffer (m2) zeigt Spalte 2', () => {
    const out = filterRoadmap(DATA, 'M2')
    const ids = out.milestones.map((m) => m.id)
    expect(ids).toContain(2)
  })
})

describe('reiner Sprint-Treffer', () => {
  test('zeigt nur Spalten mit Treffer und reduziert Sprints', () => {
    const out = filterRoadmap(DATA, 'render-smoke')
    expect(out.milestones).toHaveLength(1)
    expect(out.milestones[0].id).toBe(1)
    expect(out.milestones[0].sprints).toHaveLength(1)
    expect(out.milestones[0].sprints[0].id).toBe(102)
  })
  test('Sprint-Key-Treffer (DD2#49) reduziert auf den Sprint', () => {
    const out = filterRoadmap(DATA, 'dd2#49')
    expect(out.milestones).toHaveLength(1)
    expect(out.milestones[0].id).toBe(2)
    expect(out.milestones[0].sprints).toHaveLength(1)
  })
})

describe('Unassigned', () => {
  test('filtert auf treffende Sprints', () => {
    const out = filterRoadmap(DATA, 'graph')
    expect(out.milestones).toHaveLength(0)
    expect(out.unassignedSprints).toHaveLength(1)
    expect(out.unassignedSprints[0].id).toBe(109)
  })
})

describe('kein Treffer', () => {
  test('leere Listen wenn nichts matcht', () => {
    const out = filterRoadmap(DATA, 'zzz-nichts')
    expect(out.milestones).toHaveLength(0)
    expect(out.unassignedSprints).toHaveLength(0)
  })
})

describe('Robustheit', () => {
  test('undefined-Eingabe wirft nicht', () => {
    const out = filterRoadmap(undefined, 'x')
    expect(out.milestones).toEqual([])
    expect(out.unassignedSprints).toEqual([])
  })
})
