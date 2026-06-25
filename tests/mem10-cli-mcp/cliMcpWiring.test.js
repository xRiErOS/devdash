// MEM-10 (MEM#5): Project-Memory CLI + MCP-Tools — Wiring-Test (Source-Presence,
// analog tests/dd317/mcp-schema.test.js). Beweist, dass CLI-Subcommands + MCP-Tools
// registriert sind und gegen die project-memories REST-Routen (MEM-9) verdrahten.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')
const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

describe('MEM-10 — Project-Memory CLI', () => {
  test('exposes memory add/query/list/show subcommands', () => {
    expect(cli).toMatch(/'memory:add'/)
    expect(cli).toMatch(/'memory:query'/)
    expect(cli).toMatch(/'memory:list'/)
    expect(cli).toMatch(/'memory:show'/)
  })

  test('memory commands target the project-memories REST routes', () => {
    expect(cli).toMatch(/\/api\/project-memories/)
    expect(cli).toMatch(/\/api\/project-memories\/search/)
  })

  test('api() accepts a projectId override for X-Project-Id scoping', () => {
    expect(cli).toMatch(/async function api\(method, path, body, projectId\)/)
  })

  test('help documents memory commands', () => {
    expect(cli).toMatch(/devd-cli memory add/)
    expect(cli).toMatch(/devd-cli memory query/)
  })
})

describe('MEM-10 — Project-Memory MCP tools', () => {
  test('registers log/query/list/show tools', () => {
    expect(mcp).toMatch(/'devd_project_memory_log'/)
    expect(mcp).toMatch(/'devd_project_memory_query'/)
    expect(mcp).toMatch(/'devd_project_memory_list'/)
    expect(mcp).toMatch(/'devd_project_memory_show'/)
  })

  test('tools call the project-memories REST API', () => {
    expect(mcp).toMatch(/\/api\/project-memories/)
    expect(mcp).toMatch(/project-memories\/search/)
  })

  test('log tool enumerates all six categories', () => {
    for (const c of ['architecture_decision', 'dead_end', 'bug_pattern', 'convention', 'external_constraint', 'session_note']) {
      expect(mcp).toContain(c)
    }
  })

  test('query tool exposes project_id scoping param', () => {
    expect(mcp).toMatch(/devd_project_memory_query[\s\S]{0,400}project_id: PROJECT_ID_PARAM/)
  })
})

// MEM-25: Stichwort-Register-Surface (Grill 2026-06-21 D09).
describe('MEM-25 — Tag-Register CLI + MCP surface', () => {
  test('CLI exposes memory:tag handler targeting the register routes', () => {
    expect(cli).toMatch(/'memory:tag'/)
    expect(cli).toMatch(/\/api\/project-memory-tags/)
    expect(cli).toMatch(/\/api\/project-memory-tags\/rename/)
  })

  test('MCP registers all five register tools (incl. prune)', () => {
    for (const t of ['devd_memory_tag_list', 'devd_memory_tag_create', 'devd_memory_tag_rename', 'devd_memory_tag_delete', 'devd_memory_tag_prune']) {
      expect(mcp).toContain(`'${t}'`)
    }
  })

  test('CLI + REST expose the prune migration path (T08c)', () => {
    expect(cli).toMatch(/sub === 'prune'/)
    expect(cli).toMatch(/\/api\/project-memory-tags\/prune/)
  })
})
