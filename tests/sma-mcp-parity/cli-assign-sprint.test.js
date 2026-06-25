// D06 — CLI issue assign-sprint command
// TDD: these tests must FAIL before the command is implemented.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const cliSrc = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')

describe('CLI issue assign-sprint — source presence', () => {
  test("handler 'issue:assign-sprint' is defined", () => {
    expect(cliSrc).toMatch(/['"]issue:assign-sprint['"]/)
  })

  test('handler calls PATCH /api/backlog/:id/sprint', () => {
    const idx = cliSrc.indexOf('issue:assign-sprint')
    expect(idx).toBeGreaterThan(-1)
    const block = cliSrc.slice(idx, idx + 1000)
    expect(block).toMatch(/PATCH.*\/api\/backlog.*\/sprint/)
  })

  test('handler resolves sprint key to id via resolveSprintId', () => {
    const idx = cliSrc.indexOf('issue:assign-sprint')
    const block = cliSrc.slice(idx, idx + 1000)
    expect(block).toMatch(/resolveSprintId/)
  })

  test('handler accepts null/none to unassign sprint', () => {
    const idx = cliSrc.indexOf('issue:assign-sprint')
    const block = cliSrc.slice(idx, idx + 1000)
    // Must handle null/none as clear-signal
    expect(block).toMatch(/null|none/)
  })

  test('usage block documents issue assign-sprint', () => {
    expect(cliSrc).toMatch(/issue assign-sprint/)
  })

  test('top-of-file usage comment includes assign-sprint', () => {
    // The top-of-file JSDoc usage block (before line 100)
    const top = cliSrc.slice(0, 3000)
    expect(top).toMatch(/assign-sprint/)
  })
})
