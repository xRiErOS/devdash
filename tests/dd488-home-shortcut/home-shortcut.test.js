import { describe, test, expect, afterEach } from 'vitest'
import { createShortcutKeydownHandler } from '../../src/hooks/useKeyboardShortcuts.js'
import { withProjectSlug } from '../../src/lib/useProjectNav.js'

// DD-488 (T03) — Globaler Tastatur-Shortcut `h` öffnet das Project Home des
// aktiven Projekts (C4-Entity app.web.home-shortcut, FSD fsd.project-home-nav).
//
// Die `h`-Bindung lebt in src/components/ui/layout/Layout.jsx (`h: () => navigate('/home')`,
// navigate = useProjectNav()). Dieser Test verifiziert die zwei Garantien der
// Akzeptanz UNABHÄNGIG von React:
//   1. Plain `h` (kein Modifier, kein Form-Fokus) feuert den Home-Handler.
//   2. `h` feuert NICHT, wenn der Fokus in einem input/textarea/select/
//      contenteditable liegt (Tipp-Kontext, z.B. globale Suche).
//   3. `h` feuert NICHT mit gehaltenem Modifier (Cmd/Ctrl/Alt).
// Plus: withProjectSlug('/home', slug) prefixt den aktiven Projekt-Slug →
// /:slug/home (Project Home je Projekt).

const realDocument = globalThis.document
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

describe('DD-488 · Home-Shortcut `h`', () => {
  describe('Slug-Auflösung (withProjectSlug)', () => {
    test('`/home` wird mit aktivem Projekt-Slug geprefixt → /:slug/home', () => {
      expect(withProjectSlug('/home', 'devd')).toBe('/devd/home')
      expect(withProjectSlug('/home', 'mybaby')).toBe('/mybaby/home')
    })

    test('ohne Slug bleibt `/home` unverändert (Caller-Fallback)', () => {
      expect(withProjectSlug('/home', null)).toBe('/home')
    })

    test('bereits gescopt → kein doppeltes Prefixing', () => {
      expect(withProjectSlug('/devd/home', 'devd')).toBe('/devd/home')
    })
  })

  describe('Keydown-Dispatch', () => {
    test('plain `h` ohne Form-Fokus feuert den Home-Handler', () => {
      globalThis.document = { activeElement: null }
      const fires = []
      const onKey = createShortcutKeydownHandler(
        { current: { h: () => fires.push('home'), s: () => fires.push('board') } },
        {}
      )
      const ev = makeEvent('h')
      onKey(ev)
      expect(fires).toEqual(['home'])
      expect(ev._defaultPrevented).toBe(true)
    })

    test('`h` feuert NICHT, wenn Fokus in einem <input> liegt (Tipp-Kontext)', () => {
      globalThis.document = { activeElement: { tagName: 'INPUT', isContentEditable: false } }
      const fires = []
      const onKey = createShortcutKeydownHandler({ current: { h: () => fires.push('home') } }, {})
      const ev = makeEvent('h')
      onKey(ev)
      expect(fires).toEqual([])
    })

    test('`h` feuert NICHT in <textarea>/<select>/contenteditable', () => {
      const targets = [
        { tagName: 'TEXTAREA', isContentEditable: false },
        { tagName: 'SELECT', isContentEditable: false },
        { tagName: 'DIV', isContentEditable: true },
      ]
      for (const activeElement of targets) {
        globalThis.document = { activeElement }
        const fires = []
        const onKey = createShortcutKeydownHandler({ current: { h: () => fires.push('home') } }, {})
        onKey(makeEvent('h'))
        expect(fires).toEqual([])
      }
    })

    test('`h` mit gehaltenem Cmd/Ctrl/Alt feuert den plain-Handler NICHT', () => {
      globalThis.document = { activeElement: null }
      for (const mods of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }]) {
        const fires = []
        const onKey = createShortcutKeydownHandler({ current: { h: () => fires.push('home') } }, {})
        onKey(makeEvent('h', mods))
        expect(fires).toEqual([])
      }
    })
  })
})
