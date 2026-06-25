import { describe, test, expect } from 'vitest'
import {
  canTransition,
  canSprintTransition,
  canMilestoneTransition,
} from '../../server/lib/lifecycle.js'

// DD-524: Soft-Delete (deleted_at) ist abgelöst durch den einheitlichen
// cancelled-Status. Damit ein versehentlich/vorzeitig gecancelter Datensatz
// nicht terminal verloren ist, gibt es Reopen-Transitions aus cancelled.

describe('DD-524 — Issue reopen (canTransition)', () => {
  test('cancelled → refined ist erlaubt (Wiederherstellen)', () => {
    expect(canTransition('cancelled', 'refined').allowed).toBe(true)
  })

  test('any → cancelled verlangt weiterhin cancellationNotes', () => {
    expect(canTransition('refined', 'cancelled').allowed).toBe(false)
    expect(canTransition('refined', 'cancelled', { cancellationNotes: 'x' }).allowed).toBe(true)
  })
})

describe('DD-524 — Sprint reopen (canSprintTransition)', () => {
  test('cancelled → planning ist erlaubt (Reopen-Re-Entry)', () => {
    expect(canSprintTransition('cancelled', 'planning').allowed).toBe(true)
  })

  test('cancelled → active|review|completed bleiben abgelehnt', () => {
    expect(canSprintTransition('cancelled', 'active').allowed).toBe(false)
    expect(canSprintTransition('cancelled', 'review').allowed).toBe(false)
    expect(canSprintTransition('cancelled', 'completed').allowed).toBe(false)
  })

  test('any → cancelled verlangt weiterhin cancellationNotes', () => {
    expect(canSprintTransition('active', 'cancelled').allowed).toBe(false)
    expect(canSprintTransition('active', 'cancelled', { cancellationNotes: 'stop' }).allowed).toBe(true)
  })
})

describe('DD-524 — Milestone reopen (canMilestoneTransition)', () => {
  test('cancelled → planning ist erlaubt (Reopen-Re-Entry)', () => {
    expect(canMilestoneTransition('cancelled', 'planning').allowed).toBe(true)
  })

  test('cancelled → active|completed bleiben abgelehnt', () => {
    expect(canMilestoneTransition('cancelled', 'active').allowed).toBe(false)
    expect(canMilestoneTransition('cancelled', 'completed').allowed).toBe(false)
  })
})
