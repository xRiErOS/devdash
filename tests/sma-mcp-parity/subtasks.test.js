// L02/B06 — devd_subtask_* MCP tools (5 tools)
// TDD: these tests must FAIL before the tools are implemented.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const src = readFileSync('mcp/devd-mcp.js', 'utf8')

describe('devd_subtask_list', () => {
  test('tool is registered', () => {
    expect(src).toMatch(/devd_subtask_list/)
  })

  test('issues GET /api/backlog/:id/subtasks', () => {
    // The handler must call GET /api/backlog/:id/subtasks
    expect(src).toMatch(/\/api\/backlog\/.+\/subtasks/)
  })

  test('has id_or_key param', () => {
    // id_or_key is the standard issue identifier param used across all issue tools
    const listBlock = src.indexOf('devd_subtask_list')
    const snippet = src.slice(listBlock, listBlock + 400)
    expect(snippet).toMatch(/id_or_key/)
  })
})

describe('devd_subtask_add', () => {
  test('tool is registered', () => {
    expect(src).toMatch(/devd_subtask_add/)
  })

  test('has title as required field', () => {
    const addBlock = src.indexOf('devd_subtask_add')
    const snippet = src.slice(addBlock, addBlock + 500)
    expect(snippet).toMatch(/title/)
    // title must NOT be optional
    const titleLine = snippet.match(/title:\s*z\.[^,\n]+/)
    expect(titleLine).not.toBeNull()
    expect(titleLine[0]).not.toMatch(/\.optional\(\)/)
  })

  test('has optional qa_criteria field', () => {
    const addBlock = src.indexOf('devd_subtask_add')
    const snippet = src.slice(addBlock, addBlock + 600)
    expect(snippet).toMatch(/qa_criteria/)
  })

  test('issues POST /api/backlog/:id/subtasks', () => {
    expect(src).toMatch(/POST.*\/api\/backlog.*\/subtasks/)
  })
})

describe('devd_subtask_done', () => {
  test('tool is registered', () => {
    expect(src).toMatch(/devd_subtask_done/)
  })

  test('issues PATCH /api/subtasks/:id/status', () => {
    expect(src).toMatch(/PATCH.*\/api\/subtasks.*\/status/)
  })

  test('sets status to done', () => {
    const doneBlock = src.indexOf('devd_subtask_done')
    const snippet = src.slice(doneBlock, doneBlock + 600)
    expect(snippet).toMatch(/done/)
  })
})

describe('devd_subtask_edit', () => {
  test('tool is registered', () => {
    expect(src).toMatch(/devd_subtask_edit/)
  })

  test('issues PATCH /api/subtasks/:id', () => {
    // PATCH to /api/subtasks/:id (without /status suffix) for field updates
    expect(src).toMatch(/PATCH.*\/api\/subtasks\//)
  })

  test('has optional title and qa_criteria fields', () => {
    const editBlock = src.indexOf('devd_subtask_edit')
    const snippet = src.slice(editBlock, editBlock + 600)
    expect(snippet).toMatch(/title/)
    expect(snippet).toMatch(/qa_criteria/)
  })
})

describe('devd_subtask_remove', () => {
  test('tool is registered', () => {
    expect(src).toMatch(/devd_subtask_remove/)
  })

  test('issues DELETE /api/subtasks/:id', () => {
    expect(src).toMatch(/DELETE.*\/api\/subtasks\//)
  })

  test('has subtask_id param', () => {
    const rmBlock = src.indexOf('devd_subtask_remove')
    const snippet = src.slice(rmBlock, rmBlock + 400)
    expect(snippet).toMatch(/subtask_id/)
  })
})
