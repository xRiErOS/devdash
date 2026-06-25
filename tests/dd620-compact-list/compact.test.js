// DD-620: Compact-Default für issue_list + sprint_list. Token-Schutz — die List-Endpoints
// liefern per Default nur Identitäts-/Status-Felder; Vollobjekt via ?fields=full.
//
// server/api.js exportiert die Express-app nicht → die Projektions-/Pagination-Logik wird
// 1:1 reproduziert (Pattern wie tests/dd390-project-show-slug) + Source-Presence-Wiring.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'

// 1:1-Reproduktion von server/api.js::projectCompact + paginate (Stand DD-620).
function projectCompact(rows, compactKeys) {
  return rows.map(r => {
    const slim = {}
    for (const k of compactKeys) if (r[k] !== undefined) slim[k] = r[k]
    return slim
  })
}
function paginate(query, rows) {
  const offRaw = Number.parseInt(query.offset, 10)
  const limRaw = Number.parseInt(query.limit, 10)
  const offset = Number.isFinite(offRaw) && offRaw > 0 ? offRaw : 0
  const hasLimit = Number.isFinite(limRaw) && limRaw >= 0
  if (offset > 0 || hasLimit) {
    const end = hasLimit ? offset + limRaw : undefined
    return rows.slice(offset, end)
  }
  return rows
}

const COMPACT_BACKLOG_KEYS = [
  'id', 'key', 'project_prefix', 'project_number', 'title', 'status', 'type', 'priority',
  'assigned_sprint', 'sprint_key', 'sprint_name', 'milestone', 'review_status', 'tags',
]

const fullIssue = {
  id: 5, key: 'DD-5', project_prefix: 'DD', project_number: 5, title: 'T', status: 'planned',
  type: 'feature', priority: 2, assigned_sprint: 3, sprint_key: 'DD#1', sprint_name: 'S',
  milestone: 'M4', review_status: null, tags: ['x'],
  // SSTD-große Prosa, die NICHT in compact darf:
  goal: 'g'.repeat(5000), background: 'b'.repeat(5000), context_notes: 'c'.repeat(5000),
  acceptance_criteria: 'a'.repeat(5000), result: 'r'.repeat(5000), description: 'd'.repeat(5000),
}

describe('DD-620 — Compact-Projektion', () => {
  test('compact entfernt die Prosa-Felder (goal/background/…)', () => {
    const [slim] = projectCompact([fullIssue], COMPACT_BACKLOG_KEYS)
    expect(slim.goal).toBeUndefined()
    expect(slim.background).toBeUndefined()
    expect(slim.context_notes).toBeUndefined()
    expect(slim.result).toBeUndefined()
    expect(slim.description).toBeUndefined()
  })

  test('compact behält Identitäts-/Status-Felder inkl. key-Bestandteile + review_status', () => {
    const [slim] = projectCompact([fullIssue], COMPACT_BACKLOG_KEYS)
    expect(slim.key).toBe('DD-5')
    expect(slim.project_prefix).toBe('DD')   // formatIssueKey braucht prefix+number
    expect(slim.project_number).toBe(5)
    expect(slim.status).toBe('planned')
    expect(slim.priority).toBe(2)
    expect(slim).toHaveProperty('review_status')  // Triage-Feld (DD#80-Auslöser)
  })

  test('compact-Output ist drastisch kleiner als full', () => {
    const full = JSON.stringify(fullIssue).length
    const slim = JSON.stringify(projectCompact([fullIssue], COMPACT_BACKLOG_KEYS)[0]).length
    expect(slim).toBeLessThan(full / 10)
  })

  test('paginate: limit/offset schneiden korrekt', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: i }))
    expect(paginate({ limit: '3' }, rows).map(r => r.id)).toEqual([0, 1, 2])
    expect(paginate({ limit: '3', offset: '2' }, rows).map(r => r.id)).toEqual([2, 3, 4])
    expect(paginate({ offset: '8' }, rows).map(r => r.id)).toEqual([8, 9])
    expect(paginate({}, rows)).toHaveLength(10) // ohne limit/offset: unverändert
  })
})

describe('DD-620 — Wiring', () => {
  const api = readFileSync('apps/backend/src/api.js', 'utf8')
  const apiClient = readFileSync('apps/frontend/src/lib/apiClient.js', 'utf8')
  const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')
  const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')

  test('backlog + sprints senden über sendList mit den Compact-Sets', () => {
    expect(api).toMatch(/sendList\(req, res, items, COMPACT_BACKLOG_KEYS\)/)
    expect(api).toMatch(/sendList\(req, res, sprints, COMPACT_SPRINT_KEYS\)/)
  })

  test('Sprint-Compact behält goal (CLI sprint:list rendert es), droppt notes', () => {
    const m = api.match(/COMPACT_SPRINT_KEYS = \[([^\]]*)\]/)
    expect(m).not.toBeNull()
    expect(m[1]).toMatch(/'goal'/)
    expect(m[1]).not.toMatch(/'notes'/)
  })

  test('apiClient injiziert fields=full für Browser-GETs (UI-Schutz)', () => {
    expect(apiClient).toMatch(/fields=full/)
    expect(apiClient).toMatch(/method === 'GET'/)
  })

  test('MCP issue_list + sprint_list exponieren fields/limit/offset', () => {
    expect(mcp).toMatch(/fields: z\.enum\(\['compact', 'full'\]\)/)
  })

  test('CLI issue list + sprint list reichen fields/limit/offset durch', () => {
    expect(cli).toMatch(/if \(flags\.fields\) params\.set\('fields'/)
  })
})
