// DD-627: Milestone-Verb-Vervollständigung — reorder + dod-items CRUD + close-with-issues
// in CLI + MCP. REST + Lib (milestoneDodItems / milestoneClose) existierten → Gateway-Mirroring.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'

const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')
const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

describe('DD-627 — CLI', () => {
  test('milestone reorder/close + dod list/add/set/reorder/delete', () => {
    for (const c of ["'milestone:reorder'", "'milestone:close'", "'milestone:dod'", "'milestone:dod-add'", "'milestone:dod-set'", "'milestone:dod-reorder'", "'milestone:dod-delete'"]) {
      expect(cli).toContain(c)
    }
  })
  test('verbs hit the right routes', () => {
    expect(cli).toMatch(/'PATCH', '\/api\/milestones\/reorder'/)
    expect(cli).toMatch(/\/close-with-issues`/)
    expect(cli).toMatch(/\/dod-items`/)
    expect(cli).toMatch(/'PATCH', `\/api\/dod-items\/\$\{itemId\}`/)
    expect(cli).toMatch(/'DELETE', `\/api\/dod-items\/\$\{itemId\}`/)
  })
})

describe('DD-627 — MCP', () => {
  test('registers reorder/close + dod list/add/set/reorder/delete', () => {
    for (const t of ['devd_milestone_reorder', 'devd_milestone_close', 'devd_milestone_dod_list', 'devd_milestone_dod_add', 'devd_milestone_dod_set', 'devd_milestone_dod_reorder', 'devd_milestone_dod_delete']) {
      expect(mcp).toContain(`'${t}'`)
    }
  })
  test('dod set/delete hit /api/dod-items/:id, close hits close-with-issues', () => {
    expect(mcp).toMatch(/'PATCH', `\/api\/dod-items\/\$\{item_id\}`/)
    expect(mcp).toMatch(/'DELETE', `\/api\/dod-items\/\$\{item_id\}`/)
    expect(mcp).toMatch(/\/close-with-issues`/)
  })
})
