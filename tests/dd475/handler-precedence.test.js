import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createShortcutKeydownHandler } from '../../src/hooks/useKeyboardShortcuts.js'

// DD-475 — Doppel-'c'-Hotkey.
//
// Auf Board und Backlog registrieren der globale Layout-Handler UND der
// Page-Handler je einen window-keydown-Listener (beide mit Key 'c').
// useKeyboardShortcuts rief im matched Handler nur preventDefault(), KEIN
// stopImmediatePropagation() → bei einem 'c'-keydown feuerten BEIDE Listener
// → zwei IssueCreateModal-Instanzen.
//
// Bisher unsichtbar, weil der erste geoeffnete Modal beim Mount ein Input
// fokussierte → der zweite Listener sah document.activeElement=INPUT → der
// isInForm()-Guard unterdrueckte ihn. Diese Maskierung bricht, sobald ein
// Modal ein Nicht-Form-Element fokussiert. Empirisch (Playwright, 2026-06-10):
// onKey feuerte 2x, activeElement-Verlauf [BODY, INPUT].
//
// Dieser Test prueft die Handler-Praezedenz UNABHAENGIG vom Fokus-/autoFocus-
// Seiteneffekt: er simuliert die DOM-Dispatch-Semantik (mehrere Listener in
// Registrierungsreihenfolge; stopImmediatePropagation bricht die Schleife) mit
// document.activeElement=null (kein Form-Fokus, Guard greift NICHT).

const realDocument = globalThis.document
beforeEach(() => { globalThis.document = { activeElement: null } })
afterEach(() => { globalThis.document = realDocument })

function makeEvent(key, mods = {}) {
  return {
    key,
    metaKey: false, ctrlKey: false, altKey: false, shiftKey: false,
    ...mods,
    _defaultPrevented: false,
    _stopped: false,
    preventDefault() { this._defaultPrevented = true },
    stopImmediatePropagation() { this._stopped = true },
  }
}

// Simuliert window.dispatchEvent ueber mehrere keydown-Listener in
// Registrierungsreihenfolge: stopImmediatePropagation bricht die Iteration ab.
function dispatch(listeners, event) {
  for (const l of listeners) {
    if (event._stopped) break
    l(event)
  }
}

describe('DD-475 · useKeyboardShortcuts Handler-Praezedenz', () => {
  test('zwei Listener mit gleichem Key: nur der zuerst registrierte feuert', () => {
    const fires = []
    // Registrierungsreihenfolge = Effekt-Reihenfolge: Page-Effekt (Child)
    // laeuft vor dem Layout-Effekt (Parent) → Page-Listener zuerst.
    const page = createShortcutKeydownHandler({ current: { c: () => fires.push('page') } }, {})
    const global = createShortcutKeydownHandler({ current: { c: () => fires.push('global') } }, {})

    const ev = makeEvent('c')
    dispatch([page, global], ev)

    expect(fires).toEqual(['page'])
    expect(ev._defaultPrevented).toBe(true)
  })

  test('Listener ohne Treffer blockiert nachfolgende NICHT (kein Blanket-Stop)', () => {
    const fires = []
    const a = createShortcutKeydownHandler({ current: { x: () => fires.push('a') } }, {})
    const b = createShortcutKeydownHandler({ current: { c: () => fires.push('b') } }, {})

    dispatch([a, b], makeEvent('c'))

    expect(fires).toEqual(['b'])
  })

  test('Mod-Shortcut: nur der erste matched Handler feuert', () => {
    const fires = []
    const page = createShortcutKeydownHandler({ current: { 'mod+s': () => fires.push('page') } }, {})
    const global = createShortcutKeydownHandler({ current: { 'mod+s': () => fires.push('global') } }, {})

    dispatch([page, global], makeEvent('s', { metaKey: true }))

    expect(fires).toEqual(['page'])
  })
})
