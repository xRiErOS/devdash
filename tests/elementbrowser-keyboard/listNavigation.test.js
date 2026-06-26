// ElementBrowser Keyboard-Nav — pure Navigations-Logik (node-env, kein DOM).
// Vertrag: flattenVisible spiegelt ElementList.walk (nur aufgeklappte Knoten),
// clampIndex bewegt geklemmt ohne Wrap, rangeIds liefert die Shift+Pfeil-Range.
import { describe, test, expect } from 'vitest'
import { flattenVisible, clampIndex, rangeIds } from '../../apps/frontend/src/ui/organisms/base/listNavigation.js'

const TREE = [
  { id: 'm1', children: [
    { id: 's1', children: [{ id: 'i1' }, { id: 'i2' }] },
    { id: 's2', children: [{ id: 'i3' }] },
  ] },
  { id: 'm2' },
]

describe('flattenVisible', () => {
  test('flache Liste bleibt unverändert', () => {
    const flat = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(flattenVisible(flat, []).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  test('zugeklappte Knoten verbergen ihre Kinder', () => {
    expect(flattenVisible(TREE, []).map((x) => x.id)).toEqual(['m1', 'm2'])
  })

  test('nur aufgeklappte Knoten expandieren — in Tiefen-Reihenfolge', () => {
    expect(flattenVisible(TREE, ['m1', 's1']).map((x) => x.id))
      .toEqual(['m1', 's1', 'i1', 'i2', 's2', 'm2'])
  })

  test('Kind eines zugeklappten Eltern bleibt verborgen, auch wenn selbst expanded', () => {
    // s1 expanded, aber m1 nicht → s1/Kinder unerreichbar.
    expect(flattenVisible(TREE, ['s1']).map((x) => x.id)).toEqual(['m1', 'm2'])
  })

  test('leere Eingabe → leeres Array', () => {
    expect(flattenVisible()).toEqual([])
  })
})

describe('clampIndex', () => {
  test('kein Fokus (-1) + Bewegung → erste Zeile', () => {
    expect(clampIndex(-1, 1, 5)).toBe(0)
    expect(clampIndex(-1, -1, 5)).toBe(0)
  })

  test('runter/hoch in der Mitte', () => {
    expect(clampIndex(2, 1, 5)).toBe(3)
    expect(clampIndex(2, -1, 5)).toBe(1)
  })

  test('klemmt am oberen und unteren Rand (kein Wrap)', () => {
    expect(clampIndex(4, 1, 5)).toBe(4)
    expect(clampIndex(0, -1, 5)).toBe(0)
  })

  test('leere Liste → -1', () => {
    expect(clampIndex(0, 1, 0)).toBe(-1)
  })
})

describe('rangeIds', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']

  test('Anker oberhalb Fokus', () => {
    expect(rangeIds(ids, 1, 3)).toEqual(['b', 'c', 'd'])
  })

  test('Anker unterhalb Fokus (Reihenfolge egal)', () => {
    expect(rangeIds(ids, 3, 1)).toEqual(['b', 'c', 'd'])
  })

  test('Anker == Fokus → ein Element', () => {
    expect(rangeIds(ids, 2, 2)).toEqual(['c'])
  })

  test('ungültiger Index → leer', () => {
    expect(rangeIds(ids, -1, 2)).toEqual([])
    expect(rangeIds(ids, 2, -1)).toEqual([])
  })
})
