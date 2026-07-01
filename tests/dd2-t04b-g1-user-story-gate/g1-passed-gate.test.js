// T04b / G1 (Welle 4, D15): Ein Issue darf nur nach `passed` übergehen, wenn ALLE
// seine User Stories abgenommen sind. Der acceptance-Gate wandert vom entfernten
// `result`-Relikt (T04a) auf die user_stories. us_verdict-Vokabular = open|accepted|
// rejected; 'accepted' = abgenommen (≙ „passed" auf Story-Ebene).
//
// Q06-Grandfathering: nur NEUE Transitionen werden geblockt. Ein Issue OHNE User
// Stories ist vacuously erfüllt (kein Block) — nur Issues, die User Stories mit
// nicht-accepted-Verdict HABEN, werden am `passed`-Übergang gestoppt.

import { describe, test, expect } from 'vitest'
import { canTransition } from '../../apps/backend/src/lib/lifecycle.js'

const passedReview = { hasPassedReview: true }

describe('T04b/G1 — passed ⇐ alle User Stories accepted', () => {
  test('blockt: eine OFFENE User Story verhindert passed', () => {
    const r = canTransition('to_review', 'passed', {
      ...passedReview,
      userStories: [{ us_verdict: 'accepted' }, { us_verdict: 'open' }],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/User Stor/i)
  })

  test('blockt: eine REJECTED User Story verhindert passed', () => {
    const r = canTransition('to_review', 'passed', {
      ...passedReview,
      userStories: [{ us_verdict: 'rejected' }],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/User Stor/i)
  })

  test('erlaubt: ALLE User Stories accepted', () => {
    const r = canTransition('to_review', 'passed', {
      ...passedReview,
      userStories: [{ us_verdict: 'accepted' }, { us_verdict: 'accepted' }],
    })
    expect(r.allowed).toBe(true)
  })

  test('Grandfathering: ZERO User Stories → nicht geblockt (vacuously accepted)', () => {
    expect(canTransition('to_review', 'passed', { ...passedReview, userStories: [] }).allowed).toBe(true)
    // fehlendes Feld verhält sich wie leer
    expect(canTransition('to_review', 'passed', passedReview).allowed).toBe(true)
  })

  test('Review-Guard bleibt VOR dem User-Story-Guard (kein bestandener Review → Review-Fehler)', () => {
    const r = canTransition('to_review', 'passed', {
      hasPassedReview: false,
      userStories: [{ us_verdict: 'open' }],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/Review/)
  })
})
