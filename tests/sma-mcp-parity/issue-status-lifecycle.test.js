// L03/B07 — devd_issue_status lifecycle description fix
// TDD: these tests must FAIL before the description is updated.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const src = readFileSync('mcp/devd-mcp.js', 'utf8')

describe('devd_issue_status — lifecycle description (ADR lifecycle)', () => {
  test('description mentions planned status', () => {
    // Find the devd_issue_status block and check its description string
    const idx = src.indexOf("'devd_issue_status'")
    expect(idx).toBeGreaterThan(-1)
    const block = src.slice(idx, idx + 400)
    expect(block).toMatch(/planned/)
  })

  test('description mentions passed status', () => {
    const idx = src.indexOf("'devd_issue_status'")
    const block = src.slice(idx, idx + 400)
    expect(block).toMatch(/passed/)
  })

  test('description mentions rejected status', () => {
    const idx = src.indexOf("'devd_issue_status'")
    const block = src.slice(idx, idx + 400)
    expect(block).toMatch(/rejected/)
  })

  test('description mentions cancelled status', () => {
    const idx = src.indexOf("'devd_issue_status'")
    const block = src.slice(idx, idx + 400)
    expect(block).toMatch(/cancelled/)
  })

  test('description shows full forward lifecycle chain new → refined → planned → in_progress', () => {
    const idx = src.indexOf("'devd_issue_status'")
    const block = src.slice(idx, idx + 600)
    // Must contain the full lifecycle chain in description
    expect(block).toMatch(/new.*refined.*planned.*in_progress/s)
  })

  test('new_status describe() enumerates planned and passed', () => {
    // The z.string().describe() for new_status must list planned and passed
    const idx = src.indexOf("'devd_issue_status'")
    const block = src.slice(idx, idx + 800)
    const describeMatch = block.match(/new_status[\s\S]*?describe\([^)]+\)/)
    expect(describeMatch).not.toBeNull()
    expect(describeMatch[0]).toMatch(/planned/)
    expect(describeMatch[0]).toMatch(/passed/)
  })
})
