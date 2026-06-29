// DD2-99: Feld-Validierung devd_issue_set_result — Pflicht outcome_summary/commits,
// outcome_type enum-validiert, klare Fehler an der MCP-Grenze statt Roh-Fehler / nutzlosem
// Result. Behavioral-Test: echte Zod-Input-Shape via Monkeypatch ziehen + safeParse.

import { describe, test, expect, beforeAll } from 'vitest'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const shapes = new Map()

beforeAll(async () => {
  McpServer.prototype.tool = function (name, _desc, shape) {
    shapes.set(name, shape ?? {})
    return this
  }
  McpServer.prototype.connect = async () => {}
  await import('../../apps/cli/mcp/devd-mcp.js')
})

function parse(input) {
  const shape = shapes.get('devd_issue_set_result')
  expect(shape, 'shape for devd_issue_set_result').toBeTruthy()
  return z.object(shape).safeParse(input)
}

const valid = { id_or_key: 'DD2-1', outcome_summary: 'Tat etwas', commits: ['abc1234'] }

describe('DD2-99 — Pflichtfelder', () => {
  test('gültig: outcome_summary + commits gesetzt', () => {
    expect(parse(valid).success).toBe(true)
  })
  test('ungültig: outcome_summary fehlt', () => {
    const { outcome_summary, ...rest } = valid
    expect(parse(rest).success).toBe(false)
  })
  test('ungültig: outcome_summary leer / Whitespace', () => {
    expect(parse({ ...valid, outcome_summary: '' }).success).toBe(false)
    expect(parse({ ...valid, outcome_summary: '   ' }).success).toBe(false)
  })
  test('ungültig: commits fehlt', () => {
    const { commits, ...rest } = valid
    expect(parse(rest).success).toBe(false)
  })
  test('ungültig: commits leeres Array (D02)', () => {
    expect(parse({ ...valid, commits: [] }).success).toBe(false)
  })
  test('ungültig: commits enthält leeren String', () => {
    expect(parse({ ...valid, commits: [''] }).success).toBe(false)
  })
  test('ungültig: id_or_key leer', () => {
    expect(parse({ ...valid, id_or_key: '' }).success).toBe(false)
  })
})

describe('DD2-99 — outcome_type enum', () => {
  test('gültig: bekannter Typ', () => {
    for (const t of ['feat', 'fix', 'refactor', 'chore', 'docs']) {
      expect(parse({ ...valid, outcome_type: t }).success).toBe(true)
    }
  })
  test('gültig: outcome_type weggelassen (default feat im Handler)', () => {
    expect(parse(valid).success).toBe(true)
  })
  test('ungültig: unbekannter outcome_type', () => {
    expect(parse({ ...valid, outcome_type: 'bogus' }).success).toBe(false)
  })
})

describe('DD2-99 — optionale Felder typsicher', () => {
  test('gültig: files_changed + lessons_learned String-Arrays, vorgehen String', () => {
    expect(parse({ ...valid, files_changed: ['a.js'], lessons_learned: ['x'], vorgehen: 'so' }).success).toBe(true)
  })
  test('ungültig: files_changed kein Array', () => {
    expect(parse({ ...valid, files_changed: 'a.js' }).success).toBe(false)
  })
})
