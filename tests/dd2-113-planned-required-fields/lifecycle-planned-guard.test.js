// DD2-113 (PO-Entscheidung 2026-06-29): refined→planned erzwingt goal+background via
// Lifecycle-Guard. Schließt die Lücke direkt-als-'refined'-angelegter Issues
// (ISSUE_CREATE_STATUSES = ['new','refined']), die den new→refined-Guard umgehen.
// Reopen-Pfade (done/passed → planned) bleiben unberührt.

import { describe, test, expect } from 'vitest'
import { canTransition } from '../../apps/backend/src/lib/lifecycle.js'

const full = { goal: 'Ziel', background: 'Hintergrund', assigned_sprint: 7 }

describe('DD2-113 — refined→planned Pflichtfelder', () => {
  test('erlaubt: goal + background + assigned_sprint gesetzt', () => {
    expect(canTransition('refined', 'planned', full).allowed).toBe(true)
  })

  test('blockt: goal fehlt', () => {
    const r = canTransition('refined', 'planned', { ...full, goal: '' })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/goal und background/)
  })

  test('blockt: background fehlt', () => {
    const r = canTransition('refined', 'planned', { ...full, background: null })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/goal und background/)
  })

  test('blockt: goal+background da, aber kein Sprint', () => {
    const r = canTransition('refined', 'planned', { goal: 'g', background: 'b', assigned_sprint: null })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/assigned_sprint/)
  })

  test('Pflichtfeld-Check kommt VOR dem Sprint-Check (goal fehlt + kein Sprint → goal-Fehler)', () => {
    const r = canTransition('refined', 'planned', { goal: '', background: '', assigned_sprint: null })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/goal und background/)
  })
})

describe('DD2-113 — Reopen-Pfade bleiben unberührt', () => {
  test('done → planned erlaubt ohne goal/background (Reopen)', () => {
    expect(canTransition('done', 'planned', {}).allowed).toBe(true)
  })
  test('passed → planned erlaubt ohne goal/background (Reopen)', () => {
    expect(canTransition('passed', 'planned', {}).allowed).toBe(true)
  })
})
