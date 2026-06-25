import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// DD-308 — Source-Scan-Acceptance: CLI-Commands + MCP-Tools registriert.
// Full end-to-end via HTTP wäre Integration-Test mit laufendem Server (covered by
// existing m03-s01 t03-Tests + manual smoke against NAS).

const ROOT = resolve(import.meta.dirname, '../..')
const CLI_SRC = readFileSync(resolve(ROOT, 'bin/devd-cli.js'), 'utf8')
const MCP_SRC = readFileSync(resolve(ROOT, 'mcp/devd-mcp.js'), 'utf8')

const EXPECTED_CLI_KEYS = [
  "'todo:list'",
  "'todo:add'",
  "'todo:show'",
  "'todo:done'",
  "'todo:edit'",
  "'todo:link'",
  "'todo:delete'",
]

const EXPECTED_MCP_TOOLS = [
  'devd_todo_list',
  'devd_todo_show',
  'devd_todo_create',
  'devd_todo_update',
  'devd_todo_delete',
  'devd_todo_link',
]

describe('DD-308 — CLI Subcommands', () => {
  test.each(EXPECTED_CLI_KEYS)('CLI registriert %s', (key) => {
    expect(CLI_SRC).toContain(key)
  })

  test('CLI help-Text dokumentiert todo-Block', () => {
    expect(CLI_SRC).toMatch(/ToDos \(Project-Home, DD-308/)
    expect(CLI_SRC).toMatch(/devd-cli todo list/)
    expect(CLI_SRC).toMatch(/devd-cli todo link <id>/)
  })

  test('CLI todo:link akzeptiert genau einen Typ (--spec/--issue/--vault/--url)', () => {
    expect(CLI_SRC).toMatch(/flags\.spec/)
    expect(CLI_SRC).toMatch(/flags\.issue/)
    expect(CLI_SRC).toMatch(/flags\.vault/)
    expect(CLI_SRC).toMatch(/flags\.url/)
  })

  test('CLI todo:delete verlangt --confirm', () => {
    expect(CLI_SRC).toMatch(/--confirm erforderlich/)
  })
})

describe('DD-308 — MCP Tools', () => {
  test.each(EXPECTED_MCP_TOOLS)('MCP registriert tool %s', (name) => {
    expect(MCP_SRC).toContain(`'${name}'`)
  })

  test('MCP devd_todo_create hat label-Validation (1-280)', () => {
    expect(MCP_SRC).toMatch(/devd_todo_create[\s\S]{0,400}label[\s\S]{0,200}min\(1\)\.max\(280\)/)
  })

  test('MCP devd_todo_link erzwingt type enum spec/issue/vault/url', () => {
    expect(MCP_SRC).toMatch(/devd_todo_link[\s\S]{0,500}type:\s*z\.enum\(\[['"]spec['"],\s*['"]issue['"],\s*['"]vault['"],\s*['"]url['"]\]\)/)
  })

  test('MCP devd_todo_update status-enum entspricht D-T08-01 (open|done|cancelled)', () => {
    expect(MCP_SRC).toMatch(/devd_todo_update[\s\S]{0,800}z\.enum\(\[['"]open['"],\s*['"]done['"],\s*['"]cancelled['"]\]\)/)
  })

  test('Genau 6 ToDo-Tools mit devd_todo_-Prefix sind registriert', () => {
    const matches = MCP_SRC.match(/server\.tool\(\s*'devd_todo_/g) || []
    expect(matches).toHaveLength(6)
  })
})
