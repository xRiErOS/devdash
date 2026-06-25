// DD-363: Pure-Helper-Tests für filterAndSortTodos + isCompletedToday.
// environment: node (kein DOM nötig — reine Logik).

import { describe, test, expect } from 'vitest'
import { filterAndSortTodos, isCompletedToday } from '../../src/lib/todoFilter.js'

const NOW = new Date('2026-05-29T10:00:00') // lokale TZ
// completed_at-Strings sind UTC (wie SQLite datetime('now')).
const TODAY_UTC = '2026-05-29 08:00:00'      // = 2026-05-29 lokal (CEST +2 → 10:00)
const YESTERDAY_UTC = '2026-05-28 08:00:00'

const todos = [
  { id: 1, label: 'Open A', details: 'spec lesen', status: 'open', position: 1, completed_at: null },
  { id: 2, label: 'Done heute', details: '', status: 'done', position: 2, completed_at: TODAY_UTC },
  { id: 3, label: 'Done gestern', details: '', status: 'done', position: 3, completed_at: YESTERDAY_UTC },
  { id: 4, label: 'Cancelled X', details: '', status: 'cancelled', position: 4, completed_at: null },
  { id: 5, label: 'Open B', details: 'spec relevant', status: 'open', position: 5, completed_at: null },
]

describe('isCompletedToday', () => {
  test('true für heute (UTC→lokal selber Tag)', () => {
    expect(isCompletedToday(TODAY_UTC, NOW)).toBe(true)
  })
  test('false für gestern', () => {
    expect(isCompletedToday(YESTERDAY_UTC, NOW)).toBe(false)
  })
  test('false für null/leer/ungültig', () => {
    expect(isCompletedToday(null, NOW)).toBe(false)
    expect(isCompletedToday('', NOW)).toBe(false)
    expect(isCompletedToday(undefined, NOW)).toBe(false)
    expect(isCompletedToday('not-a-date', NOW)).toBe(false)
  })
})

describe('filterAndSortTodos — Default (search leer, showAll=false)', () => {
  test('zeigt offene + heute-done, versteckt alt-done + cancelled', () => {
    const out = filterAndSortTodos(todos, { showAll: false, search: '', now: NOW })
    expect(out.map(t => t.id)).toEqual([1, 2, 5])
  })

  test('leerer Suchstring (whitespace) → Default-Ansicht', () => {
    const out = filterAndSortTodos(todos, { showAll: false, search: '   ', now: NOW })
    expect(out.map(t => t.id)).toEqual([1, 2, 5])
  })

  test('sortiert nach position ASC', () => {
    const out = filterAndSortTodos(todos, { showAll: false, search: '', now: NOW })
    expect(out.map(t => t.position)).toEqual([1, 2, 5])
  })
})

describe('filterAndSortTodos — showAll', () => {
  test('zeigt ALLE todos in position-Reihenfolge', () => {
    const out = filterAndSortTodos(todos, { showAll: true, search: '', now: NOW })
    expect(out.map(t => t.id)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('filterAndSortTodos — Suche', () => {
  test('matcht label + details, ignoriert Default-Filter (alt-done erscheint)', () => {
    const search = [...todos, { id: 6, label: 'spec ding', status: 'done', position: 0, completed_at: YESTERDAY_UTC }]
    const out = filterAndSortTodos(search, { showAll: false, search: 'spec', now: NOW })
    // id 1 (details 'spec lesen'), id 5 (details 'spec relevant') open; id 6 (label 'spec ding') done
    expect(out.map(t => t.id)).toEqual([1, 5, 6])
  })

  test('open vor done sortiert, je Gruppe position ASC', () => {
    const data = [
      { id: 10, label: 'foo done', status: 'done', position: 1, completed_at: YESTERDAY_UTC },
      { id: 11, label: 'foo open hi', status: 'open', position: 9, completed_at: null },
      { id: 12, label: 'foo open lo', status: 'open', position: 2, completed_at: null },
    ]
    const out = filterAndSortTodos(data, { search: 'foo', now: NOW })
    expect(out.map(t => t.id)).toEqual([12, 11, 10])
  })

  test('case-insensitive', () => {
    const out = filterAndSortTodos(todos, { search: 'OPEN', now: NOW })
    expect(out.map(t => t.id).sort()).toEqual([1, 5])
  })

  test('cancelled ans Ende bei Treffer', () => {
    const data = [
      { id: 20, label: 'task cancel', status: 'cancelled', position: 1 },
      { id: 21, label: 'task open', status: 'open', position: 2, completed_at: null },
    ]
    const out = filterAndSortTodos(data, { search: 'task', now: NOW })
    expect(out.map(t => t.id)).toEqual([21, 20])
  })

  test('Suche ignoriert showAll (selbe Treffermenge)', () => {
    const a = filterAndSortTodos(todos, { showAll: false, search: 'open', now: NOW })
    const b = filterAndSortTodos(todos, { showAll: true, search: 'open', now: NOW })
    expect(a.map(t => t.id)).toEqual(b.map(t => t.id))
  })
})

describe('filterAndSortTodos — Robustheit', () => {
  test('nicht-Array → []', () => {
    expect(filterAndSortTodos(null, {})).toEqual([])
    expect(filterAndSortTodos(undefined, {})).toEqual([])
  })
  test('Eingabe-Array bleibt unverändert', () => {
    const snapshot = todos.map(t => t.id)
    filterAndSortTodos(todos, { showAll: true, search: '', now: NOW })
    expect(todos.map(t => t.id)).toEqual(snapshot)
  })
})
