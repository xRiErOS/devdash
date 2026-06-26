// RoadmapBoard — DnD-Mathe (reine Logik, Node-Env, kein DOM).
// Deckt die exportierten pure functions aus src/lib/roadmapBoardDnd.js:
// ID-Helfer, Spalten-Reorder, Dep-Validierung, Reorder-Anwendung, Card-Move.

import { describe, test, expect } from 'vitest'
import {
  colDragId, cardDragId, colDropId, parseDragId,
  computeColumnReorder, validateColumnReorder, applyColumnReorder, computeCardMove,
} from '../../apps/frontend/src/lib/roadmapBoardDnd.js'

const COLS = [
  { id: 1, name: 'M1', position: 0 },
  { id: 2, name: 'M2', position: 1 },
  { id: 3, name: 'M3', position: 2 },
]
// M1 muss vor M2 stehen.
const DEPS = [{ id: 9, predecessor_id: 1, successor_id: 2 }]

describe('ID-Helfer', () => {
  test('col/card/drop bauen das erwartete Präfix-Schema', () => {
    expect(colDragId(3)).toBe('col:3')
    expect(cardDragId(12)).toBe('card:12')
    expect(colDropId(5)).toBe('drop:5')
    expect(colDropId(null)).toBe('drop:null')
  })

  test('parseDragId zerlegt korrekt inkl. null-Ziel', () => {
    expect(parseDragId('col:3')).toEqual({ type: 'col', id: 3 })
    expect(parseDragId('card:12')).toEqual({ type: 'card', id: 12 })
    expect(parseDragId('drop:null')).toEqual({ type: 'drop', id: null })
    expect(parseDragId('drop:7')).toEqual({ type: 'drop', id: 7 })
  })

  test('parseDragId fällt bei Müll/leer auf {null,null}', () => {
    expect(parseDragId('quatsch')).toEqual({ type: null, id: null })
    expect(parseDragId(null)).toEqual({ type: null, id: null })
    expect(parseDragId('foo:1')).toEqual({ type: null, id: null })
  })
})

describe('computeColumnReorder', () => {
  test('zieht aktive Spalte an die Position der Über-Spalte (nach vorn)', () => {
    // M3 über M1 → [3,1,2]
    expect(computeColumnReorder(COLS, 'col:3', 'col:1')).toEqual([3, 1, 2])
  })

  test('zieht nach hinten korrekt', () => {
    // M1 über M3 → [2,3,1]
    expect(computeColumnReorder(COLS, 'col:1', 'col:3')).toEqual([2, 3, 1])
  })

  test('respektiert position (nicht Array-Reihenfolge) beim Sortieren', () => {
    const shuffled = [
      { id: 3, name: 'M3', position: 2 },
      { id: 1, name: 'M1', position: 0 },
      { id: 2, name: 'M2', position: 1 },
    ]
    expect(computeColumnReorder(shuffled, 'col:2', 'col:1')).toEqual([2, 1, 3])
  })

  test('No-Op wenn active == over', () => {
    expect(computeColumnReorder(COLS, 'col:2', 'col:2')).toEqual([1, 2, 3])
  })
})

describe('validateColumnReorder', () => {
  test('gültig, wenn Vorgänger vor Nachfolger steht', () => {
    expect(validateColumnReorder(DEPS, [1, 2, 3])).toBe(true)
    expect(validateColumnReorder(DEPS, [1, 3, 2])).toBe(true)
  })

  test('ungültig, wenn Nachfolger vor Vorgänger gezogen wird', () => {
    expect(validateColumnReorder(DEPS, [2, 1, 3])).toBe(false)
    expect(validateColumnReorder(DEPS, [3, 2, 1])).toBe(false)
  })

  test('ignoriert Deps, deren Enden nicht im Board sind', () => {
    const deps = [{ id: 1, predecessor_id: 1, successor_id: 99 }]
    expect(validateColumnReorder(deps, [2, 1, 3])).toBe(true)
  })

  test('leere/fehlende Deps → immer gültig', () => {
    expect(validateColumnReorder([], [3, 2, 1])).toBe(true)
    expect(validateColumnReorder(undefined, [3, 2, 1])).toBe(true)
  })
})

describe('applyColumnReorder', () => {
  test('schreibt neue position gemäß ID-Folge, ohne zu mutieren', () => {
    const next = applyColumnReorder(COLS, [3, 1, 2])
    expect(next.map((c) => [c.id, c.position])).toEqual([[3, 0], [1, 1], [2, 2]])
    // Quelle unverändert
    expect(COLS[0].position).toBe(0)
  })

  test('hängt nicht gelistete Spalten stabil ans Ende', () => {
    const next = applyColumnReorder(COLS, [2])
    expect(next[0]).toMatchObject({ id: 2, position: 0 })
    expect(next.map((c) => c.id)).toEqual([2, 1, 3])
  })
})

describe('computeCardMove', () => {
  const CARDS = [
    { id: 10, milestone_id: 1, position: 0 },
    { id: 11, milestone_id: 1, position: 1 },
    { id: 12, milestone_id: 2, position: 0 },
    { id: 13, milestone_id: null, position: 0 },
  ]

  test('Move in andere Spalte → ans Ende (Default)', () => {
    // Card 10 aus M1 in M2 (hat 1 Card) → position 1
    expect(computeCardMove(CARDS, 'card:10', 'drop:2', 2)).toEqual({ milestone_id: 2, position: 1 })
  })

  test('Move auf eine Card → an deren Index einfügen', () => {
    // Card 13 (unassigned) über Card 12 in M2 → position 0
    expect(computeCardMove(CARDS, 'card:13', 'card:12', 2)).toEqual({ milestone_id: 2, position: 0 })
  })

  test('Move nach Unassigned (targetColId null)', () => {
    // Card 10 → Unassigned (hat 1 Card: 13) → ans Ende position 1
    expect(computeCardMove(CARDS, 'card:10', 'drop:null', null)).toEqual({ milestone_id: null, position: 1 })
  })

  test('aktive Card zählt nicht in die Ziel-Länge (Move innerhalb derselben Spalte)', () => {
    // Card 10 innerhalb M1 ans Ende: M1 ohne 10 hat nur 11 → position 1
    expect(computeCardMove(CARDS, 'card:10', 'drop:1', 1)).toEqual({ milestone_id: 1, position: 1 })
  })
})
