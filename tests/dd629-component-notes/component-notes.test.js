// DD-629: component-notes CLI + MCP. REST (GET list/get, PUT upsert, DELETE) existierte;
// 0 Gateway. Die Route ist PATH-gescopt auf eine NUMERISCHE project_id → CLI/MCP lösen
// das Projekt zuerst auf die numerische id auf (resolveProject / resolveNumericProjectId).

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'

const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')
const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

describe('DD-629 — CLI', () => {
  test('component-note list/show/set/delete', () => {
    for (const c of ["'component-note:list'", "'component-note:show'", "'component-note:set'", "'component-note:delete'"]) {
      expect(cli).toContain(c)
    }
  })
  test('löst project auf numerische id auf + trifft die Route', () => {
    expect(cli).toMatch(/resolveProject\(flags\.project \|\| PROJECT_ID\)/)
    expect(cli).toMatch(/\/api\/projects\/\$\{p\.id\}\/component-notes/)
  })
})

describe('DD-629 — MCP', () => {
  test('registers list/get/set/delete', () => {
    for (const t of ['devd_component_note_list', 'devd_component_note_get', 'devd_component_note_set', 'devd_component_note_delete']) {
      expect(mcp).toContain(`'${t}'`)
    }
  })
  test('resolveNumericProjectId nutzt DD-390 slug-resolve (GET /api/projects/:id)', () => {
    expect(mcp).toMatch(/function resolveNumericProjectId/)
    expect(mcp).toMatch(/\/api\/projects\/\$\{npid\}\/component-notes/)
  })
})
