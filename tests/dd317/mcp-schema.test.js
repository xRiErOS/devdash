// DD-317 / DD-45 D30 — MCP schema field guards.
// E01/D09: per-issue acceptance_criteria + test_instruction are ABOLISHED (replaced by
// user_stories[].qa). This test now asserts their absence from the issue tools and the
// presence of the devd_user_story_* tools. description (D30) stays supported.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const src = readFileSync('mcp/devd-mcp.js', 'utf8')

describe('DD-317 / E01 D09 — MCP issue field schema', () => {
  test('issue create/update/full/bulk schemas no longer expose acceptance_criteria/test_instruction', () => {
    expect(src).not.toMatch(/acceptance_criteria: z\.string\(\)\.optional\(\)/)
    expect(src).not.toMatch(/test_instruction: z\.string\(\)\.optional\(\)/)
    expect(src).not.toMatch(/Structured QA\/acceptance criteria for refinement/)
  })

  test('descriptions point per-US QA to user_stories[].qa (D09)', () => {
    expect(src).toMatch(/user_stories\[\]\.qa/)
  })

  test('devd_user_story_* tools are registered (E01.4)', () => {
    for (const tool of [
      'devd_user_story_list',
      'devd_user_story_add',
      'devd_user_story_edit',
      'devd_user_story_verdict',
      'devd_user_story_remove',
    ]) {
      expect(src).toContain(`'${tool}'`)
    }
    // Backend-B02: story-scoped verdict field is us_verdict, not verdict.
    expect(src).toMatch(/us_verdict: z\.enum\(\['open', 'accepted', 'rejected'\]\)/)
  })

  test('soft-deprecated description IS still part of issue create/update/full/bulk schemas (D30)', () => {
    expect(src).toMatch(/description: z\.string\(\)\.optional\(\)/)
    expect(src).toMatch(/soft-deprecated but still accepted per D30/)
  })

  test('issue_update tool description lists description as supported field (D30)', () => {
    expect(src).toMatch(/title, description, goal, background/)
  })

  test('issue_create_full tool description lists description as supported field (D30)', () => {
    expect(src).toMatch(/description, goal, background, context_notes/)
  })
})
