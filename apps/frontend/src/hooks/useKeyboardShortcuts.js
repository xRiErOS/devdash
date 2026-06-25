import { useEffect, useRef } from 'react'

/**
 * useKeyboardShortcuts — DD-38 / DD-78 / DD-112.
 *
 * Map-Schluessel:
 *   - Plain key:           '/' | 'n' | 'Escape'
 *   - Modifier:            'mod+s' | 'mod+enter'  (mod = Cmd ODER Ctrl)
 *   - Sequenz:             'g b' | 'g s'          (zwei Tasten <800ms)
 *
 * Verhalten:
 *   - Plain Keys feuern NICHT, wenn Fokus in input/textarea/select/contenteditable ist
 *     (Ausnahme: Escape — feuert immer; Mod-Keys — feuern immer, da explizit gewuenscht).
 *   - Sequenzen feuern nicht in Form-Fokus.
 *   - DD-475: Im gematchten Handler wird stopImmediatePropagation() gerufen, damit
 *     bei mehreren window-keydown-Listenern (globaler Layout- + Page-Handler auf
 *     denselben Key, z.B. 'c') nur der ZUERST registrierte feuert. Effekt-Reihenfolge
 *     = Child(Page) vor Parent(Layout) → Praezedenz Page > global, deterministisch und
 *     unabhaengig vom isInForm-/autoFocus-Seiteneffekt.
 */

function isInForm() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

/**
 * Baut den keydown-Handler fuer eine Shortcut-Map. Ausgelagert aus useEffect, damit
 * die Dispatch-Praezedenz (DD-475) unabhaengig von React unit-testbar ist.
 *
 * @param {{current: Record<string, (e: KeyboardEvent) => void>}} mapRef  Ref auf die Shortcut-Map
 * @param {{pendingPrefix?: string|null, pendingTimer?: any}} state  veraenderlicher Sequenz-Zustand
 * @returns {(e: KeyboardEvent) => void} onKey-Listener
 */
export function createShortcutKeydownHandler(mapRef, state = {}) {
  return function onKey(e) {
    const map = mapRef.current
    const key = e.key
    const isMod = e.metaKey || e.ctrlKey

    // 1. Mod-Shortcut (mod+s, mod+enter, ...)
    if (isMod && !e.altKey) {
      const lookup = `mod+${key.toLowerCase()}`
      const handler = map[lookup]
      if (handler) {
        // DD-342: Cmd/Ctrl+Pfeil in Formularfeldern dem Browser ueberlassen
        // (Cursor an Zeilenanfang/-ende) — keine App-Navigation beim Editieren.
        if ((key === 'ArrowLeft' || key === 'ArrowRight') && isInForm()) return
        e.preventDefault()
        e.stopImmediatePropagation()
        handler(e)
      }
      return
    }
    if (e.altKey) return

    // 2. Sequenz-Resolution
    if (state.pendingPrefix) {
      const seq = `${state.pendingPrefix} ${key.toLowerCase()}`
      const handler = map[seq]
      clearTimeout(state.pendingTimer)
      state.pendingPrefix = null
      if (handler) {
        if (isInForm()) return
        e.preventDefault()
        e.stopImmediatePropagation()
        handler(e)
      }
      return
    }

    // 3. Direkter Key-Match
    const handler = map[key]
    if (handler) {
      if (key !== 'Escape' && isInForm()) return
      e.preventDefault()
      e.stopImmediatePropagation()
      handler(e)
      return
    }

    // 4. Sequenz-Prefix erkennen
    const lcKey = String(key).toLowerCase()
    const hasSequence = Object.keys(map).some(k => k.startsWith(`${lcKey} `))
    if (hasSequence && !isInForm()) {
      state.pendingPrefix = lcKey
      state.pendingTimer = setTimeout(() => { state.pendingPrefix = null }, 800)
    }
  }
}

export default function useKeyboardShortcuts(map, { enabled = true } = {}) {
  const mapRef = useRef(map)
  mapRef.current = map

  useEffect(() => {
    if (!enabled) return
    const state = { pendingPrefix: null, pendingTimer: null }
    const onKey = createShortcutKeydownHandler(mapRef, state)

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (state.pendingTimer) clearTimeout(state.pendingTimer)
    }
  }, [enabled])
}
