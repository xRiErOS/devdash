// DD2-123 — backlog_export: LLM-taugliche Formate md(default)|json|yaml (csv raus).
// Pure Serializer ohne Express/DB.
import { describe, test, expect } from 'vitest'
import { parse as yamlParse } from 'yaml'
import { serializeBacklog } from '../../apps/backend/src/lib/backlogExport.js'

const ITEMS = [
  { id: 7, prefix: 'DD2', project_number: 42, title: 'Titel mit, Komma', status: 'new', type: 'feature', priority: 2, sprint_name: null, milestone: 'M1', tags: ['ui', 'mcp'], created_at: '2026-06-01', completed_at: null },
  { id: 8, prefix: 'DD2', project_number: 43, title: 'Zweites Issue', status: 'refined', type: 'bug', priority: 3, sprint_name: 'Sprint X', milestone: null, tags: [], created_at: '2026-06-02', completed_at: null },
]

describe('DD2-123 — serializeBacklog', () => {
  test('default = markdown', () => {
    const out = serializeBacklog(ITEMS, undefined)
    expect(out.ext).toBe('md')
    expect(out.contentType).toMatch(/markdown/)
    expect(out.body).toContain('# Backlog')
    expect(out.body).toContain('[DD2-42]')
    expect(out.body).toContain('Titel mit, Komma')
  })

  test('json: valides Array mit key + tags', () => {
    const out = serializeBacklog(ITEMS, 'json')
    expect(out.ext).toBe('json')
    expect(out.contentType).toMatch(/json/)
    const parsed = JSON.parse(out.body)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].key).toBe('DD2-42')
    expect(parsed[0].tags).toEqual(['ui', 'mcp'])
    expect(parsed[0].title).toBe('Titel mit, Komma')
  })

  test('yaml: round-trip parsebar', () => {
    const out = serializeBacklog(ITEMS, 'yaml')
    expect(out.ext).toBe('yaml')
    expect(out.contentType).toMatch(/yaml/)
    const parsed = yamlParse(out.body)
    expect(parsed[0].key).toBe('DD2-42')
    expect(parsed[1].title).toBe('Zweites Issue')
  })

  test('csv wird NICHT mehr unterstützt — fällt auf md zurück', () => {
    const out = serializeBacklog(ITEMS, 'csv')
    expect(out.ext).toBe('md')
    expect(out.contentType).toMatch(/markdown/)
  })

  test('unbekanntes Format → md-Fallback', () => {
    expect(serializeBacklog(ITEMS, 'xml').ext).toBe('md')
  })
})
