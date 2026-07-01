// T04b / G2 (Welle 4, D16): Ein Issue darf einem Sprint nur zugewiesen werden,
// wenn es mindestens EINE User Story hat. Der Guard sitzt im Assign-Pfad
// (canAssignSprint), NICHT als globale Invariante über den Bestand.
//
// Q06-Grandfathering: nur die NEUE Zuweisung wird geprüft — bereits einem Sprint
// zugewiesene Issues werden nicht rückwirkend invalidiert. Deshalb ist der Guard
// eine reine Assign-Vorbedingung, kein Reconcile über die DB.

import { describe, test, expect } from 'vitest'
import { canAssignSprint } from '../../apps/backend/src/lib/lifecycle.js'

describe('T04b/G2 — Sprint-Zuweisung ⇐ ≥1 User Story', () => {
  test('blockt: KEINE User Story (count 0)', () => {
    const r = canAssignSprint({ userStoryCount: 0 })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/User Stor/i)
  })

  test('blockt: fehlendes userStoryCount verhält sich wie 0', () => {
    expect(canAssignSprint({}).allowed).toBe(false)
    expect(canAssignSprint().allowed).toBe(false)
  })

  test('erlaubt: genau 1 User Story', () => {
    expect(canAssignSprint({ userStoryCount: 1 }).allowed).toBe(true)
  })

  test('erlaubt: mehrere User Stories', () => {
    expect(canAssignSprint({ userStoryCount: 3 }).allowed).toBe(true)
  })
})
