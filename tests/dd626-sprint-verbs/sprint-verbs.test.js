// DD-626: Sprint-Verb-Vervollständigung — update/reorder/delete in CLI + MCP.
// REST + sprintUpdate/Reorder-Contracts (DD-561) lagen bereit → reines Gateway-Mirroring.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { sprintUpdateContract, sprintReorderContract } from '@devd/api-types/milestone-sprint.contracts.js'

describe('DD-626 — Contracts (DD-561, hier verdrahtet)', () => {
  test('sprintUpdate: alle Felder optional, name non-empty wenn gesetzt', () => {
    expect(sprintUpdateContract.safeParse({}).success).toBe(true)
    expect(sprintUpdateContract.safeParse({ goal: 'x' }).success).toBe(true)
    expect(sprintUpdateContract.safeParse({ name: '' }).success).toBe(false)
  })
  test('sprintReorder: ordered_ids Ganzzahl-Array (coerce)', () => {
    expect(sprintReorderContract.safeParse({ ordered_ids: [3, 1, 2] }).success).toBe(true)
    expect(sprintReorderContract.safeParse({ ordered_ids: ['3', '1'] }).success).toBe(true)
  })
})

describe('DD-626 — Wiring', () => {
  const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

  test('CLI exposes sprint update/reorder/delete', () => {
    for (const c of ["'sprint:update'", "'sprint:reorder'", "'sprint:delete'"]) expect(cli).toContain(c)
    expect(cli).toMatch(/parseOrThrow\(sprintUpdateContract/)
    expect(cli).toMatch(/parseOrThrow\(sprintReorderContract/)
  })
  test('CLI verbs hit the right routes', () => {
    expect(cli).toMatch(/'PUT', `\/api\/sprints\/\$\{id\}`/)
    expect(cli).toMatch(/'PATCH', '\/api\/sprints\/reorder'/)
    expect(cli).toMatch(/'DELETE', `\/api\/sprints\/\$\{id\}`/)
  })
  test('MCP registers devd_sprint_update/reorder/delete', () => {
    for (const t of ['devd_sprint_update', 'devd_sprint_reorder', 'devd_sprint_delete']) expect(mcp).toContain(`'${t}'`)
  })
})
