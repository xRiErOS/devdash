// DD-621: backlog Audit-Gap-Verben (bulk/delete/move/activity) in CLI + MCP.
// REST existierte bereits; Contract (bulk/move) + CLI/MCP-Spiegelung neu.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { BULK_ACTIONS, backlogBulkContract, backlogMoveContract } from '../../contracts/backlog.contracts.js'

describe('DD-621 — Contracts', () => {
  test('BULK_ACTIONS deckt die server-seitigen Actions', () => {
    expect(BULK_ACTIONS).toEqual(['set_status', 'set_sprint', 'cancel', 'soft_delete', 'add_tags', 'remove_tags'])
  })

  test('bulk: ids (≥1) + action-Enum; payload optional', () => {
    expect(backlogBulkContract.safeParse({ ids: [1, 2], action: 'set_status', payload: { status: 'done' } }).success).toBe(true)
    expect(backlogBulkContract.safeParse({ ids: ['3'], action: 'cancel' }).success).toBe(true) // coerce, payload optional
    expect(backlogBulkContract.safeParse({ ids: [], action: 'set_status' }).success).toBe(false)
    expect(backlogBulkContract.safeParse({ ids: [1], action: 'nope' }).success).toBe(false)
  })

  test('bulk payload: sprint_id darf null sein (unassign)', () => {
    expect(backlogBulkContract.safeParse({ ids: [1], action: 'set_sprint', payload: { sprint_id: null } }).success).toBe(true)
    expect(backlogBulkContract.safeParse({ ids: [1], action: 'set_sprint', payload: { sprint_id: 5 } }).success).toBe(true)
  })

  test('move: target_project_id positive Ganzzahl', () => {
    expect(backlogMoveContract.safeParse({ target_project_id: 3 }).success).toBe(true)
    expect(backlogMoveContract.safeParse({ target_project_id: '3' }).success).toBe(true)
    expect(backlogMoveContract.safeParse({ target_project_id: 0 }).success).toBe(false)
  })
})

describe('DD-621 — Wiring', () => {
  const cli = readFileSync('bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')

  test('CLI exposes issue bulk/delete/move/activity', () => {
    for (const c of ["'issue:bulk'", "'issue:delete'", "'issue:move'", "'issue:activity'"]) expect(cli).toContain(c)
    expect(cli).toMatch(/parseOrThrow\(backlogBulkContract/)
    expect(cli).toMatch(/parseOrThrow\(backlogMoveContract/)
  })

  test('CLI verbs hit the right REST routes/verbs', () => {
    expect(cli).toMatch(/'PATCH', '\/api\/backlog\/bulk'/)
    expect(cli).toMatch(/'DELETE', `\/api\/backlog\/\$\{id\}\$\{qs\}`/)
    expect(cli).toMatch(/'POST', `\/api\/backlog\/\$\{id\}\/move`/)
    expect(cli).toMatch(/\/api\/backlog\/\$\{id\}\/activity/)
  })

  test('MCP registers devd_issue_bulk/delete/move/activity', () => {
    for (const t of ['devd_issue_bulk', 'devd_issue_delete', 'devd_issue_move', 'devd_issue_activity']) {
      expect(mcp).toContain(`'${t}'`)
    }
    expect(mcp).toMatch(/z\.enum\(BULK_ACTIONS\)/)
  })

  test('MCP move resolves the target project to a numeric id (slug-safe via DD-390)', () => {
    expect(mcp).toMatch(/\/api\/projects\/\$\{encodeURIComponent\(String\(target_project\)\)\}/)
    expect(mcp).toMatch(/target_project_id: target\.id/)
  })
})
