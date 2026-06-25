// DD-273 (M3-S02 T01): Pure DOM-Helpers für Debug-Mode (Wiki 40.01/40.02).
// Extrahiert aus DebugContext.jsx damit Logik unter vitest-node-env testbar bleibt.

export const RESERVED_PREFIX = 'ui-debug.'
export const SEQUENCE_TIMEOUT_MS = 800

/**
 * True wenn target ein Eingabe-Element ist und Tastatur-Shortcuts NICHT feuern dürfen.
 * Akzeptiert Mock-Objekte mit {tagName, getAttribute, isContentEditable}.
 */
export function isInputElement(target) {
  if (!target || typeof target !== 'object') return false
  const tag = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : ''
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable === true) return true
  const role = typeof target.getAttribute === 'function' ? target.getAttribute('role') : null
  return role === 'combobox' || role === 'textbox'
}

/**
 * Sucht nearest-ancestor mit `data-ui`-Attribut. Reserved Prefix `ui-debug.*` filtert
 * sich raus, damit Hover über das Debug-Interface selbst keinen Lookup auslöst.
 * Erwartet Element-ähnliche Objekte mit {nodeType, getAttribute, parentElement}.
 */
export function getUiDebugIdFromTarget(target) {
  let el = target
  while (el && el.nodeType === 1) {
    const id = typeof el.getAttribute === 'function' ? el.getAttribute('data-ui') : null
    if (id && !id.startsWith(RESERVED_PREFIX)) return id
    el = el.parentElement
  }
  return null
}

/**
 * True wenn target (oder ein Vorfahr) zum Debug-Interface selbst gehört, d.h. ein
 * `data-ui`-Attribut mit Reserved-Prefix `ui-debug.*` trägt.
 */
export function isReservedDebugTarget(target) {
  let el = target
  while (el && el.nodeType === 1) {
    const id = typeof el.getAttribute === 'function' ? el.getAttribute('data-ui') : null
    if (id && id.startsWith(RESERVED_PREFIX)) return true
    el = el.parentElement
  }
  return false
}

/**
 * Liefert das nächste Vorfahr-Element mit `data-ui` (Reserved-Prefix `ui-debug.*`
 * gefiltert). DD-273 R4 (DevWiki 40.02): nötig für die Element-Outline ("Ränder")
 * und für Alt-Klick-Insert — beide brauchen das Element selbst (getBoundingClientRect),
 * nicht nur den Slug-String. Erwartet Element-ähnliche Objekte mit
 * {nodeType, getAttribute, parentElement}.
 */
export function getUiDebugElementFromTarget(target) {
  let el = target
  while (el && el.nodeType === 1) {
    const id = typeof el.getAttribute === 'function' ? el.getAttribute('data-ui') : null
    if (id && !id.startsWith(RESERVED_PREFIX)) return el
    el = el.parentElement
  }
  return null
}

/**
 * Sequenz-Matcher für Chord-Shortcuts wie "g d". Pure (kein Timer hier — Caller
 * räumt Pending via .reset() per setTimeout auf). Erlaubt deterministische Tests
 * durch direktes Feed plus Inspect.
 */
export function createSequenceMatcher() {
  let pending = ''
  return {
    /**
     * Feedet ein keydown-Event-Objekt {key, target?, metaKey?, ctrlKey?, altKey?}.
     * @returns 'toggle' | 'pending' | 'ignore' | 'modifier-reset' | 'form-reset'
     */
    feed(event) {
      if (event && isInputElement(event.target)) {
        pending = ''
        return 'form-reset'
      }
      if (event && (event.metaKey || event.ctrlKey || event.altKey)) {
        pending = ''
        return 'modifier-reset'
      }
      const key = event?.key
      if (pending === 'g' && key === 'd') {
        pending = ''
        return 'toggle'
      }
      if (key === 'g') {
        pending = 'g'
        return 'pending'
      }
      pending = ''
      return 'ignore'
    },
    reset() {
      pending = ''
    },
    get pending() {
      return pending
    },
  }
}
