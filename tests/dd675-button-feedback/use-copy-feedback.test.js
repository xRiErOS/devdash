// DD-675 — Unified visible feedback for copy/action buttons.
//
// Environment-Hinweis: Das Repo testet per Default in env=node (vitest.config.js)
// und hat KEIN jsdom / @testing-library/react / react-test-renderer installiert.
// Daher kein renderHook-Mount mit Effects. Stattdessen prüfen wir den vom Hook
// gekapselten, pur-testbaren Kern `performCopy` (clipboard-write + toast-dispatch
// + Rückgabewert) headless. Die React-state-/Timer-Verdrahtung (transienter
// `copied`-State, Timeout-Cleanup bei Unmount/Re-Copy) wird über den
// feedback-source-guard.test.js strukturell belegt — visuelle Abnahme = PO.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast } from '../../apps/frontend/src/lib/toast.js'
import { performCopy } from '../../apps/frontend/src/hooks/useCopyFeedback.js'

// Minimal-Window-Shim für env=node: toast() + performCopy() dispatchen auf window.
function installWindow() {
  const listeners = []
  globalThis.window = {
    dispatchEvent: vi.fn((ev) => {
      listeners.forEach((l) => l(ev))
      return true
    }),
    addEventListener: (_t, fn) => listeners.push(fn),
    removeEventListener: () => {},
  }
}

function lastToast() {
  const calls = window.dispatchEvent.mock.calls
  const ev = calls[calls.length - 1]?.[0]
  return ev ? { type: ev.type, ...ev.detail } : null
}

beforeEach(() => {
  installWindow()
  // navigator ist in env=node ein read-only Getter → vi.stubGlobal (kein direkter Assign).
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } })
  // CustomEvent in env=node nachbilden (jsdom-frei).
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete globalThis.window
  delete globalThis.CustomEvent
})

describe('DD-675 — toast() single source', () => {
  test('dispatch devd-toast mit message + kind', () => {
    toast('Hallo', 'success')
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1)
    expect(lastToast()).toEqual({ type: 'devd-toast', message: 'Hallo', kind: 'success' })
  })

  test('default kind = info', () => {
    toast('ohne kind')
    expect(lastToast()).toEqual({ type: 'devd-toast', message: 'ohne kind', kind: 'info' })
  })

  test('SSR-Guard: ohne window kein Throw', () => {
    delete globalThis.window
    expect(() => toast('safe')).not.toThrow()
  })
})

describe('DD-675 — performCopy (Hook-Kern)', () => {
  test('Erfolg: schreibt Clipboard, feuert success-Toast, gibt true', async () => {
    navigator.clipboard.writeText.mockResolvedValue(undefined)
    const ok = await performCopy('payload', 'Kopiert')
    expect(ok).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('payload')
    expect(lastToast()).toEqual({ type: 'devd-toast', message: 'Kopiert', kind: 'success' })
  })

  test('Erfolg: success-Message default = "Kopiert"', async () => {
    navigator.clipboard.writeText.mockResolvedValue(undefined)
    await performCopy('payload')
    expect(lastToast()).toEqual({ type: 'devd-toast', message: 'Kopiert', kind: 'success' })
  })

  test('Fehler (reject): feuert error-Toast, gibt false', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('denied'))
    const ok = await performCopy('payload', 'Kopiert')
    expect(ok).toBe(false)
    expect(lastToast()).toEqual({
      type: 'devd-toast',
      message: 'Kopieren fehlgeschlagen',
      kind: 'error',
    })
  })

  test('Fehler (kein clipboard verfügbar): error-Toast, gibt false', async () => {
    delete navigator.clipboard
    const ok = await performCopy('payload')
    expect(ok).toBe(false)
    expect(lastToast()).toEqual({
      type: 'devd-toast',
      message: 'Kopieren fehlgeschlagen',
      kind: 'error',
    })
  })
})
