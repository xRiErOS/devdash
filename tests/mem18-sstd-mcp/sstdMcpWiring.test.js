// MEM-18 (MEM#6): SSTD-Slots MCP-Tools — Wiring-Test (Source-Presence,
// analog tests/mem10-cli-mcp/cliMcpWiring.test.js + tests/dd317/mcp-schema.test.js).
// Beweist, dass die devd_sstd_*-Tools registriert sind und gegen die MEM-16-Slot-REST verdrahten.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')

describe('MEM-18 — SSTD-Slots MCP tools', () => {
  test('registers get / slot_get / slot_set / slot_edit / journal_add', () => {
    expect(mcp).toMatch(/'devd_sstd_get'/)
    expect(mcp).toMatch(/'devd_sstd_slot_get'/)
    expect(mcp).toMatch(/'devd_sstd_slot_set'/)
    expect(mcp).toMatch(/'devd_sstd_slot_edit'/)
    expect(mcp).toMatch(/'devd_sstd_journal_add'/)
  })

  test('slot tools target the slot REST routes (GET/PUT + PATCH line)', () => {
    expect(mcp).toMatch(/\/sstd\/slots\//)
    expect(mcp).toMatch(/\/sstd\/slots\/[^`]*\/line/)
  })

  test('slot_edit enumerates the four line ops', () => {
    const block = mcp.slice(mcp.indexOf("'devd_sstd_slot_edit'"))
    for (const op of ['patch', 'insert_after', 'insert_before', 'delete']) {
      expect(block).toContain(op)
    }
  })

  test('SLOT_KEYS spiegelt die sechs fixen Slots', () => {
    for (const k of ['architecture', 'conventions', 'sprint_state', 'roadmap', 'cross_refs', 'misc']) {
      expect(mcp).toContain(k)
    }
  })

  test('journal_add aliasiert eine session_note Project-Memory', () => {
    const block = mcp.slice(mcp.indexOf("'devd_sstd_journal_add'"))
    expect(block).toMatch(/session_note/)
    expect(block).toMatch(/\/api\/project-memories/)
  })

  test('SSTD-Slot-Tools lösen slug → numerische Projekt-ID auf (pfad-gescopt)', () => {
    const block = mcp.slice(mcp.indexOf("'devd_sstd_slot_get'"))
    expect(block).toMatch(/resolveProjectNumericId/)
  })
})
