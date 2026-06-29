// DD2-110: devd_backlog_list — dediziertes MCP-Tool für das ECHTE Backlog.
// Backlog-Semantik (TUI-autoritativ, messages.go): status='new' ∪
// (status='planned' ∧ assigned_sprint IS NULL). Backend /api/backlog komponiert
// status+sprint_id mit AND → zwei Calls + Merge/Dedup. Parity-Check über den Quelltext
// (Idiom wie tests/dd629), verankert die Query-Semantik gegen Regression.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'

const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

// Schneidet den Handler-Block von devd_backlog_list heraus (bis zum nächsten server.tool).
function backlogToolBlock(src) {
  const start = src.indexOf("'devd_backlog_list'")
  expect(start).toBeGreaterThan(-1)
  const next = src.indexOf('server.tool(', start + 1)
  return src.slice(start, next === -1 ? undefined : next)
}

describe('DD2-110 — devd_backlog_list Registrierung', () => {
  test('Tool ist registriert', () => {
    expect(mcp).toContain("'devd_backlog_list'")
  })

  test('grenzt sich semantisch von devd_issue_list ab (Doc erwähnt new ∪ planned-unassigned)', () => {
    const block = backlogToolBlock(mcp)
    expect(block).toMatch(/status\s+"new"/)
    expect(block).toMatch(/planned/)
    expect(block).toMatch(/no sprint assigned|sprint=null|assigned_sprint/i)
  })
})

describe('DD2-110 — Query-Semantik', () => {
  const block = backlogToolBlock(mcp)

  test('Query 1: status=new', () => {
    expect(block).toMatch(/\.set\(\s*['"]status['"]\s*,\s*['"]new['"]\s*\)/)
  })

  test('Query 2: status=planned UND sprint_id=null (unassigned)', () => {
    expect(block).toMatch(/\.set\(\s*['"]status['"]\s*,\s*['"]planned['"]\s*\)/)
    expect(block).toMatch(/\.set\(\s*['"]sprint_id['"]\s*,\s*['"]null['"]\s*\)/)
  })

  test('refined ist NICHT Teil der Backlog-Query', () => {
    expect(block).not.toMatch(/['"]refined['"]/)
  })

  test('zwei /api/backlog-Calls (parallel) + Merge/Dedup nach key', () => {
    const calls = block.match(/\/api\/backlog\?\$\{q/g) || []
    expect(calls.length).toBe(2)
    expect(block).toMatch(/new Set\(\)/)
    expect(block).toMatch(/it\.key\s*\?\?\s*it\.id/)
  })

  test('hält die Backend-Filter type/search/fields durch + limit nach Merge', () => {
    expect(block).toMatch(/base\.set\(\s*['"]type['"]/)
    expect(block).toMatch(/base\.set\(\s*['"]search['"]/)
    expect(block).toMatch(/base\.set\(\s*['"]fields['"]/)
    expect(block).toMatch(/merged\.slice\(0,\s*limit\)/)
  })
})
