// DD-625: project-memory Write-Vollständigkeit — CLI + MCP spiegeln die bereits
// existierenden REST-Routen (PATCH/:id, DELETE/:id, POST/:id/supersede, GET/PATCH anchor/:anchor).
// Source-Presence-Wiring-Test analog tests/mem10-cli-mcp/cliMcpWiring.test.js.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const cli = readFileSync('bin/devd-cli.js', 'utf8')
const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')

describe('DD-625 — Project-Memory Write CLI', () => {
  test('exposes update/supersede/delete/anchor/anchor-patch subcommands', () => {
    expect(cli).toMatch(/'memory:update'/)
    expect(cli).toMatch(/'memory:supersede'/)
    expect(cli).toMatch(/'memory:delete'/)
    expect(cli).toMatch(/'memory:anchor'/)
    expect(cli).toMatch(/'memory:anchor-patch'/)
  })

  test('update/supersede guard payloads against the contracts (parseOrThrow)', () => {
    expect(cli).toMatch(/parseOrThrow\(memoryUpdateContract/)
    expect(cli).toMatch(/parseOrThrow\(memorySupersedeContract/)
  })

  test('commands target the right REST routes/verbs', () => {
    expect(cli).toMatch(/'PATCH', `\/api\/project-memories\/\$\{id\}`/)
    expect(cli).toMatch(/'POST', `\/api\/project-memories\/\$\{id\}\/supersede`/)
    expect(cli).toMatch(/'DELETE', `\/api\/project-memories\/\$\{id\}`/)
    expect(cli).toMatch(/project-memories\/anchor\//)
  })

  test('help documents the new write commands', () => {
    expect(cli).toMatch(/devd-cli memory update/)
    expect(cli).toMatch(/devd-cli memory supersede/)
    expect(cli).toMatch(/devd-cli memory delete/)
    expect(cli).toMatch(/devd-cli memory anchor/)
  })
})

describe('DD-625 — Project-Memory Write MCP tools', () => {
  test('registers update/supersede/delete/anchor_get/anchor_patch tools', () => {
    expect(mcp).toMatch(/'devd_project_memory_update'/)
    expect(mcp).toMatch(/'devd_project_memory_supersede'/)
    expect(mcp).toMatch(/'devd_project_memory_delete'/)
    expect(mcp).toMatch(/'devd_project_memory_anchor_get'/)
    expect(mcp).toMatch(/'devd_project_memory_anchor_patch'/)
  })

  test('write tools hit the correct REST verbs', () => {
    expect(mcp).toMatch(/'PATCH', `\/api\/project-memories\/\$\{id\}`/)
    expect(mcp).toMatch(/'POST', `\/api\/project-memories\/\$\{id\}\/supersede`/)
    expect(mcp).toMatch(/'DELETE', `\/api\/project-memories\/\$\{id\}`/)
    expect(mcp).toMatch(/project-memories\/anchor\//)
  })

  test('edit fields keep the category enum inline (source-grep parity, #304)', () => {
    expect(mcp).toMatch(/MEMORY_EDIT_FIELDS[\s\S]{0,120}z\.enum\(MEMORY_CATEGORIES\)/)
  })
})
