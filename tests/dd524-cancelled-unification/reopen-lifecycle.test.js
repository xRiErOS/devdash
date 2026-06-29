import { describe, test, expect } from 'vitest'
import {
  canTransition,
  canSprintTransition,
  canMilestoneTransition,
} from '../../apps/backend/src/lib/lifecycle.js'

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
  test('cancelled → new ist erlaubt (Reopen-Re-Entry)', () => {
    expect(canSprintTransition('cancelled', 'new').allowed).toBe(true)
  })

  test('cancelled → in_progress|to_review|completed bleiben abgelehnt', () => {
    expect(canSprintTransition('cancelled', 'in_progress').allowed).toBe(false)
    expect(canSprintTransition('cancelled', 'to_review').allowed).toBe(false)
    expect(canSprintTransition('cancelled', 'completed').allowed).toBe(false)
  })

  test('any → cancelled verlangt weiterhin cancellationNotes', () => {
    expect(canSprintTransition('in_progress', 'cancelled').allowed).toBe(false)
    expect(canSprintTransition('in_progress', 'cancelled', { cancellationNotes: 'stop' }).allowed).toBe(true)
  })
})

describe('DD-524 — Milestone reopen (canMilestoneTransition)', () => {
  test('cancelled → new ist erlaubt (Reopen-Re-Entry)', () => {
    expect(canMilestoneTransition('cancelled', 'new').allowed).toBe(true)
  })

  test('cancelled → in_progress|completed bleiben abgelehnt', () => {
    expect(canMilestoneTransition('cancelled', 'in_progress').allowed).toBe(false)
    expect(canMilestoneTransition('cancelled', 'completed').allowed).toBe(false)
  })
})
