// DD-622: Compact-Default + fields=full/limit/offset auf den verbleibenden flachen
// List-Endpoints jenseits DD-620 — GET /api/project-memories (ohne 64k-content) und
// GET /api/projects (ohne sstd_content-Blob + Project-Home-Prosa).
//
// Bewusst AUSGENOMMEN (dokumentiert): /api/milestones (genestete Bucket-Struktur, ~18
// Einträge, kein Token-Cap-Buster), /api/backlog-export (formatierter md/csv-Download,
// keine JSON-Liste), sprint context (bewusstes Full-AI-Bundle laut SOP). Compact dort
// würde die Konsumenten aktiv brechen statt schützen.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'

function projectCompact(rows, compactKeys) {
  return rows.map(r => {
    const slim = {}
    for (const k of compactKeys) if (r[k] !== undefined) slim[k] = r[k]
    return slim
  })
}

const COMPACT_MEMORY_KEYS = [
  'id', 'category', 'summary', 'anchor', 'stability', 'pinned', 'importance',
  'tags', 'source_type', 'source_ref', 'superseded_by', 'created_at', 'updated_at',
]
const COMPACT_PROJECT_KEYS = [
  'id', 'slug', 'name', 'prefix', 'color', 'archived', 'description',
  'storybook_url', 'repo_path', 'docs_path', 'public_capture', 'sprint_count', 'backlog_count',
]

describe('DD-622 — Compact-Projektion (Memory/Projects)', () => {
  test('memory-compact droppt das 64k-content-Feld, behält Identität', () => {
    const full = { id: 1, category: 'convention', summary: 's', anchor: 'D01', stability: 'stable', content: 'x'.repeat(64000), tags: 'a b' }
    const [slim] = projectCompact([full], COMPACT_MEMORY_KEYS)
    expect(slim.content).toBeUndefined()
    expect(slim.summary).toBe('s')
    expect(slim.anchor).toBe('D01')
    expect(slim.tags).toBe('a b')
    expect(JSON.stringify(slim).length).toBeLessThan(300)
  })

  test('projects-compact droppt sstd_content + vision/goals/summary_*', () => {
    const full = {
      id: 2, slug: 'devd', name: 'DevD', prefix: 'DD', archived: 0, sprint_count: 5, backlog_count: 200,
      sstd_content: 'blob'.repeat(5000), vision: 'v'.repeat(2000), goals: 'g'.repeat(2000),
      summary_achieved: 'a'.repeat(2000), summary_next: 'n'.repeat(2000),
    }
    const [slim] = projectCompact([full], COMPACT_PROJECT_KEYS)
    expect(slim.sstd_content).toBeUndefined()
    expect(slim.vision).toBeUndefined()
    expect(slim.goals).toBeUndefined()
    expect(slim.summary_achieved).toBeUndefined()
    expect(slim.slug).toBe('devd')
    expect(slim.backlog_count).toBe(200)
  })
})

describe('DD-622 — Wiring', () => {
  const api = readFileSync('server/api.js', 'utf8')
  const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')
  const cli = readFileSync('bin/devd-cli.js', 'utf8')

  test('project-memories + projects senden über sendList', () => {
    expect(api).toMatch(/sendList\(req, res, rows, COMPACT_MEMORY_KEYS\)/)
    expect(api).toMatch(/sendList\(req, res, rows, COMPACT_PROJECT_KEYS\)/)
  })

  test('milestones-Endpoint bleibt UNkompaktiert (genestete Bucket-Struktur)', () => {
    // Die milestones-Route darf NICHT über sendList mit einem COMPACT_MILESTONE_KEYS laufen.
    expect(api).not.toMatch(/COMPACT_MILESTONE_KEYS/)
  })

  test('MCP project_list + memory_list exponieren fields-Opt-in', () => {
    expect(mcp).toMatch(/devd_project_list[\s\S]{0,400}fields: z\.enum/)
    expect(mcp).toMatch(/devd_project_memory_list[\s\S]{0,500}fields: z\.enum/)
  })

  test('CLI project list + memory list reichen --full/--fields durch', () => {
    expect(cli).toMatch(/project:list[\s\S]{0,300}fields/)
    expect(cli).toMatch(/memory:list[\s\S]{0,400}fields/)
  })
})
