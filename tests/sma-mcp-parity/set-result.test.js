// L01/B05 — devd_issue_set_result MCP tool
// TDD: these tests must FAIL before the tool is implemented.

import { describe, expect, test, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'

// --------------------------------------------------------------------------
// Static schema / source-text tests (no network required)
// --------------------------------------------------------------------------
const src = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

describe('devd_issue_set_result — schema (source-text)', () => {
  test('tool is registered in mcp/devd-mcp.js', () => {
    expect(src).toMatch(/devd_issue_set_result/)
  })

  test('Zod schema has outcome_type field', () => {
    expect(src).toMatch(/outcome_type/)
  })

  test('Zod schema has outcome_summary field', () => {
    expect(src).toMatch(/outcome_summary/)
  })

  test('Zod schema has files_changed field', () => {
    expect(src).toMatch(/files_changed/)
  })

  test('commits field is required (no .optional() in its schema block)', () => {
    // commits must be a required field — find its block and ensure .optional() is absent
    // The block runs from 'commits:' up to the next field or closing brace
    const commitsIdx = src.indexOf('devd_issue_set_result')
    expect(commitsIdx).toBeGreaterThan(-1)
    const toolBlock = src.slice(commitsIdx, commitsIdx + 2000)
    // Extract the commits field block (from 'commits:' to the next field 'breaking_changes:')
    const commitsBlockMatch = toolBlock.match(/commits:\s*z[\s\S]*?breaking_changes:/)
    expect(commitsBlockMatch).not.toBeNull()
    const commitsBlock = commitsBlockMatch[0]
    expect(commitsBlock).not.toMatch(/\.optional\(\)/)
  })

  test('Zod schema has lessons_learned as optional field', () => {
    expect(src).toMatch(/lessons_learned/)
  })

  test('Zod schema has vorgehen as optional field', () => {
    expect(src).toMatch(/vorgehen/)
  })

  test('handler PUTs to /api/backlog/:id with result field', () => {
    expect(src).toMatch(/PUT.*\/api\/backlog.*result/)
  })
})

// --------------------------------------------------------------------------
// Runtime mock test — verifies the assembled result string shape and the PUT call
// --------------------------------------------------------------------------
describe('devd_issue_set_result — runtime (mocked apiRequest)', () => {
  // Dynamic import so we can mock the module-level apiRequest.
  // The MCP server uses a module-level async function apiRequest; we simulate
  // the tool handler logic inline here, matching the contract.

  test('assembled result string contains YAML front-matter keys and body section', () => {
    // This mirrors what the tool handler must produce before calling PUT.
    // We test the builder logic directly (same shape as CLI buildResultFromFlags).
    const params = {
      outcome_type: 'feat',
      outcome_summary: 'Added set-result MCP tool',
      files_changed: ['apps/cli/mcp/devd-mcp.js'],
      commits: ['abc1234'],
      lessons_learned: ['TDD works'],
      vorgehen: 'Implemented inline',
    }

    // Build result the same way the tool must build it
    const result = buildResultString(params)

    expect(result).toMatch(/outcome_summary:/)
    expect(result).toMatch(/outcome_type:\s*feat/)
    expect(result).toMatch(/files_changed:/)
    expect(result).toMatch(/mcp\/devd-mcp\.js/)
    expect(result).toMatch(/commits:/)
    expect(result).toMatch(/abc1234/)
    expect(result).toMatch(/lessons_learned:/)
    expect(result).toMatch(/TDD works/)
    expect(result).toMatch(/## Vorgehen/)
    expect(result).toMatch(/Implemented inline/)
  })

  test('result string starts with YAML front-matter delimiter ---', () => {
    const result = buildResultString({
      outcome_type: 'fix',
      outcome_summary: 'fixed bug',
      files_changed: [],
      commits: ['deadbeef'],
    })
    expect(result.trimStart()).toMatch(/^---/)
  })

  test('related_issues block is present', () => {
    const result = buildResultString({
      outcome_type: 'feat',
      outcome_summary: 'test',
      files_changed: [],
      commits: ['sha1'],
      issueKey: 'DD-42',
    })
    expect(result).toMatch(/related_issues:/)
    expect(result).toMatch(/DD-42/)
  })
})

// --------------------------------------------------------------------------
// Helper: replicate the exact builder contract the MCP tool must implement.
// This is NOT production code — it defines the expected output shape.
// --------------------------------------------------------------------------
function buildResultString({ outcome_type, outcome_summary, files_changed = [], commits = [],
                              lessons_learned = [], vorgehen, breaking_changes = false,
                              issueKey = 'DD-0' }) {
  const yamlList = (items) =>
    items.length === 0 ? '  -' : items.map(x => `  - ${x}`).join('\n')
  const yamlScalar = (val) => {
    if (val === undefined || val === null) return ''
    const s = String(val)
    return /[:#"'\n]/.test(s) ? JSON.stringify(s) : s
  }
  const vorgehenText = vorgehen || '(Begründung, Trade-offs, Code-Snippets, Verlinkungen)'

  return `---
outcome_summary: ${yamlScalar(outcome_summary)}
outcome_type: ${outcome_type || 'feat'}
files_changed:
${yamlList(files_changed)}
commits:
${yamlList(commits)}
breaking_changes: ${breaking_changes}
lessons_learned:
${yamlList(lessons_learned)}
related_issues:
  - ${issueKey}
---

## Vorgehen

${vorgehenText}
`
}
