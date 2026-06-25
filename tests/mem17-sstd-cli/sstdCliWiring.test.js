// MEM-17 (MEM#6): SSTD-Slots CLI sstd-Namespace — Wiring-Test (Source-Presence,
// analog tests/mem10-cli-mcp/cliMcpWiring.test.js). Beweist, dass die Slot-Verben
// registriert sind und gegen die MEM-16-Slot-REST-Routen verdrahten.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')

describe('MEM-17 — SSTD-Slots CLI', () => {
  test('exposes sstd show/slot/set/edit/journal subcommands', () => {
    expect(cli).toMatch(/'sstd:show'/)
    expect(cli).toMatch(/'sstd:slot'/)
    expect(cli).toMatch(/'sstd:set'/)
    expect(cli).toMatch(/'sstd:edit'/)
    expect(cli).toMatch(/'sstd:journal'/)
  })

  test('slot commands target the slot REST routes (GET/PUT + PATCH line)', () => {
    expect(cli).toMatch(/\/sstd\/slots\//)
    expect(cli).toMatch(/\/sstd\/slots\/[^']*\/line/)
  })

  test('edit-Verb verdrahtet die Line-Op-Parameter (op/line/expect)', () => {
    const block = cli.slice(cli.indexOf("'sstd:edit'"))
    expect(block).toMatch(/op/)
    expect(block).toMatch(/line/)
    expect(block).toMatch(/expect/)
  })

  test('journal --add aliasiert eine session_note Project-Memory', () => {
    const block = cli.slice(cli.indexOf("'sstd:journal'"))
    expect(block).toMatch(/session_note/)
    expect(block).toMatch(/\/api\/project-memories/)
  })

  test('project sstd bleibt Read-All-Alias (Back-Compat)', () => {
    expect(cli).toMatch(/'project:sstd'/)
  })

  test('help dokumentiert die sstd-Kommandos', () => {
    expect(cli).toMatch(/devd-cli sstd show/)
    expect(cli).toMatch(/devd-cli sstd edit/)
  })
})
