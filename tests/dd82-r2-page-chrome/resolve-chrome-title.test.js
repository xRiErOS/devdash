import { describe, test, expect } from 'vitest'
import { resolveChromeTitle } from '../../src/lib/pageChrome.jsx'

// DD#82-r2 — Sub-Header-Titel-Hoist: der Sub-Header zeigt den Titel NUR, wenn der
// publizierte Eintrag zum aktuell sichtbaren Pfad gehört. So bleibt beim View-
// Wechsel kein veralteter Titel der Vor-View stehen (path-scoped last-write-wins),
// und die Leiste rendert leer (konstante Höhe), bis die neue View ihren Titel
// publiziert hat. resolveChromeTitle ist die pure Auflösungs-Quelle.

describe('resolveChromeTitle (DD#82-r2)', () => {
  test('null/undefined entry → leerer Titel', () => {
    expect(resolveChromeTitle(null, '/devd/home')).toBe('')
    expect(resolveChromeTitle(undefined, '/devd/home')).toBe('')
  })

  test('Pfad stimmt überein → publizierter Titel', () => {
    expect(resolveChromeTitle({ path: '/devd/backlog', title: 'Backlog · devd' }, '/devd/backlog'))
      .toBe('Backlog · devd')
  })

  test('Pfad weicht ab (stale Vor-View) → leer, kein Bleed', () => {
    expect(resolveChromeTitle({ path: '/devd/backlog', title: 'Backlog · devd' }, '/devd/memories'))
      .toBe('')
  })

  test('leerer publizierter Titel bleibt leer (View ohne Titel)', () => {
    expect(resolveChromeTitle({ path: '/devd/settings', title: '' }, '/devd/settings')).toBe('')
  })

  test('nicht-String-Titel wird defensiv zu leer', () => {
    expect(resolveChromeTitle({ path: '/x', title: null }, '/x')).toBe('')
    expect(resolveChromeTitle({ path: '/x', title: 42 }, '/x')).toBe('')
  })
})
