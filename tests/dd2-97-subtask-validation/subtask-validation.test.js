// DD2-97: Eingabe-Validierung der devd_subtask_* MCP-Tools gehärtet — klare Fehler an der
// MCP-Input-Boundary statt loser z.string()/z.number()-Typen. Behavioral-Test: die echten
// Zod-Input-Shapes werden via Monkeypatch (wie scripts/gen-mcp-notes.mjs) aus dem registrierten
// Server gezogen und mit gültigen/ungültigen Inputs gegen z.object(shape).safeParse geprüft.

import { describe, test, expect, beforeAll } from 'vitest'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const shapes = new Map()

beforeAll(async () => {
  // server.tool(name, desc, shape, handler) abfangen; connect neutralisieren (top-level await).
  McpServer.prototype.tool = function (name, _desc, shape) {
    shapes.set(name, shape ?? {})
    return this
  }
  McpServer.prototype.connect = async () => {}
  await import('../../apps/cli/mcp/devd-mcp.js')
})

function parse(toolName, input) {
  const shape = shapes.get(toolName)
  expect(shape, `shape for ${toolName}`).toBeTruthy()
  return z.object(shape).safeParse(input)
}

describe('DD2-97 — devd_subtask_add Input-Validierung', () => {
  test('gültig: title gesetzt', () => {
    expect(parse('devd_subtask_add', { id_or_key: 'DD2-1', title: 'Tu was' }).success).toBe(true)
  })
  test('ungültig: title fehlt', () => {
    expect(parse('devd_subtask_add', { id_or_key: 'DD2-1' }).success).toBe(false)
  })
  test('ungültig: title leer / nur Whitespace', () => {
    expect(parse('devd_subtask_add', { id_or_key: 'DD2-1', title: '' }).success).toBe(false)
    expect(parse('devd_subtask_add', { id_or_key: 'DD2-1', title: '   ' }).success).toBe(false)
  })
  test('ungültig: id_or_key leer', () => {
    expect(parse('devd_subtask_add', { id_or_key: '', title: 'x' }).success).toBe(false)
  })
  test('ungültig: position keine Ganzzahl', () => {
    expect(parse('devd_subtask_add', { id_or_key: 'DD2-1', title: 'x', position: 1.5 }).success).toBe(false)
  })
})

describe('DD2-97 — devd_subtask_list Input-Validierung', () => {
  test('gültig: id_or_key gesetzt', () => {
    expect(parse('devd_subtask_list', { id_or_key: 'DD2-1' }).success).toBe(true)
  })
  test('ungültig: id_or_key leer', () => {
    expect(parse('devd_subtask_list', { id_or_key: '' }).success).toBe(false)
  })
})

describe('DD2-97 — subtask_id positive Ganzzahl (done/edit/remove)', () => {
  for (const tool of ['devd_subtask_done', 'devd_subtask_edit', 'devd_subtask_remove']) {
    test(`${tool}: gültig subtask_id=5`, () => {
      expect(parse(tool, { subtask_id: 5 }).success).toBe(true)
    })
    test(`${tool}: ungültig subtask_id=0`, () => {
      expect(parse(tool, { subtask_id: 0 }).success).toBe(false)
    })
    test(`${tool}: ungültig subtask_id=-1`, () => {
      expect(parse(tool, { subtask_id: -1 }).success).toBe(false)
    })
    test(`${tool}: ungültig subtask_id=2.5`, () => {
      expect(parse(tool, { subtask_id: 2.5 }).success).toBe(false)
    })
  }
})

describe('DD2-97 — devd_subtask_edit Felder', () => {
  test('gültig: nur subtask_id (Partial-Update, keine Pflichtfelder)', () => {
    expect(parse('devd_subtask_edit', { subtask_id: 3 }).success).toBe(true)
  })
  test('ungültig: title leer wenn gesetzt', () => {
    expect(parse('devd_subtask_edit', { subtask_id: 3, title: '  ' }).success).toBe(false)
  })
})
