// MEM-15: pure Helfer der project_memories-UI. Keine React/DOM-Abhängigkeit.

import { describe, test, expect } from 'vitest'
import {
  CATEGORIES,
  STABILITIES,
  categoryLabel,
  parseTags,
  buildMemoriesPath,
} from '../../src/lib/projectMemory.js'

describe('MEM-15 — projectMemory helpers', () => {
  test('CATEGORIES + STABILITIES spiegeln das Backend-Schema', () => {
    expect(CATEGORIES).toEqual([
      'architecture_decision', 'dead_end', 'bug_pattern',
      'convention', 'external_constraint', 'session_note',
    ])
    expect(STABILITIES).toEqual(['volatile', 'stable'])
  })

  test('categoryLabel mappt bekannte Kategorien, fällt sonst zurück', () => {
    expect(categoryLabel('architecture_decision')).toBe('Entscheidung')
    expect(categoryLabel('unbekannt')).toBe('unbekannt')
  })

  test('parseTags: String (komma/space), Array, Leeres', () => {
    expect(parseTags('fts5, phase1')).toEqual(['fts5', 'phase1'])
    expect(parseTags('a b   c')).toEqual(['a', 'b', 'c'])
    expect(parseTags(['x', ' y '])).toEqual(['x', 'y'])
    expect(parseTags('')).toEqual([])
    expect(parseTags(null)).toEqual([])
  })

  test('buildMemoriesPath: leere Query → Liste', () => {
    expect(buildMemoriesPath({})).toBe('/api/project-memories')
    expect(buildMemoriesPath({ q: '   ' })).toBe('/api/project-memories')
  })

  test('buildMemoriesPath: Liste mit category-Filter', () => {
    expect(buildMemoriesPath({ category: 'bug_pattern' }))
      .toBe('/api/project-memories?category=bug_pattern')
  })

  test('buildMemoriesPath: nicht-leere Query → FTS5-Search', () => {
    expect(buildMemoriesPath({ q: 'websocket' }))
      .toBe('/api/project-memories/search?q=websocket')
  })

  test('buildMemoriesPath: Search mit category', () => {
    const p = buildMemoriesPath({ q: 'fts5', category: 'convention' })
    expect(p.startsWith('/api/project-memories/search?')).toBe(true)
    expect(p).toContain('q=fts5')
    expect(p).toContain('category=convention')
  })
})
