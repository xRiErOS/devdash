import { describe, test, expect } from 'vitest'
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  issueCreateContract,
  issueUpdateContract,
  issueStatusContract,
  issueAssignSprintContract,
  issueDependencyContract,
} from '@devd/api-types/backlog.contracts.js'

// DD-560: Contract spiegelt die REST-Struktur-Validierung von POST/PUT /api/backlog.
describe('DD-560 issueCreateContract', () => {
  test('valid minimal', () => {
    expect(issueCreateContract.safeParse({ title: 'X', type: 'bug' }).success).toBe(true)
  })
  test('title Pflicht (Message)', () => {
    const r = issueCreateContract.safeParse({ type: 'bug' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('title ist Pflichtfeld')
  })
  test('leerer/whitespace title → Pflicht', () => {
    expect(issueCreateContract.safeParse({ title: '   ', type: 'bug' }).success).toBe(false)
  })
  test('type-Enum-Message', () => {
    const r = issueCreateContract.safeParse({ title: 'X', type: 'chore' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('type muss einer von bug|feature|improvement|core sein')
  })
  test('create-status nur new|refined', () => {
    expect(issueCreateContract.safeParse({ title: 'X', type: 'bug', status: 'refined' }).success).toBe(true)
    expect(issueCreateContract.safeParse({ title: 'X', type: 'bug', status: 'new' }).success).toBe(true)
    expect(issueCreateContract.safeParse({ title: 'X', type: 'bug', status: 'done' }).success).toBe(false)
  })
  test('priority coerce + range', () => {
    expect(issueCreateContract.safeParse({ title: 'X', type: 'bug', priority: '2' }).success).toBe(true)
    expect(issueCreateContract.safeParse({ title: 'X', type: 'bug', priority: 9 }).success).toBe(false)
  })
})

describe('DD-560 issueUpdateContract', () => {
  test('leerer Body OK', () => {
    expect(issueUpdateContract.safeParse({}).success).toBe(true)
  })
  test('title leer → Message', () => {
    const r = issueUpdateContract.safeParse({ title: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('title darf nicht leer sein')
  })
  test('bad type abgelehnt', () => {
    expect(issueUpdateContract.safeParse({ type: 'x' }).success).toBe(false)
  })
  test('null-clearing-Felder erlaubt (goal/po_notes null)', () => {
    expect(issueUpdateContract.safeParse({ goal: null, po_notes: null }).success).toBe(true)
  })
})

describe('DD-560 status/assign/dep', () => {
  test('status ∈ Lifecycle-Set', () => {
    for (const s of ISSUE_STATUSES) expect(issueStatusContract.safeParse({ status: s }).success).toBe(true)
    expect(issueStatusContract.safeParse({ status: 'zzz' }).success).toBe(false)
  })
  test('assign-sprint Zahl|null', () => {
    expect(issueAssignSprintContract.safeParse({ sprint_id: 5 }).success).toBe(true)
    expect(issueAssignSprintContract.safeParse({ sprint_id: null }).success).toBe(true)
  })
  test('dependency depends_on_id Pflicht', () => {
    expect(issueDependencyContract.safeParse({ depends_on_id: 7 }).success).toBe(true)
    expect(issueDependencyContract.safeParse({ note: 'x' }).success).toBe(false)
  })
  test('ISSUE_TYPES Single Source', () => {
    expect(ISSUE_TYPES).toEqual(['bug', 'feature', 'improvement', 'core'])
  })
})
