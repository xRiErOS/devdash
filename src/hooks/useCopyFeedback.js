// DD-675 — Wiederverwendbarer Copy-Feedback-Hook.
//
// Vereinheitlicht das Feedback aller Copy-/Action-Buttons: ein transienter
// `copied`-State (für den Lucide-Check-Swap, ~1.5s) PLUS ein globaler Toast
// (toast()-Single-Source). Kapselt clipboard-write + Erfolg/Fehler-Toast in der
// pur-testbaren `performCopy`; der Hook verdrahtet nur React-State + Timer-Reset
// inkl. Cleanup bei Unmount und vor jedem Re-Copy (kein setState-after-unmount).

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '../lib/toast.js'

const FAIL_MSG = 'Kopieren fehlgeschlagen'

/**
 * Schreibt `text` in die Zwischenablage und feuert den passenden Toast.
 * Pur (keine React-Abhängigkeit) → headless testbar.
 * @param {string} text - zu kopierender Text
 * @param {string} [successMsg='Kopiert'] - Erfolgs-Toast-Message
 * @returns {Promise<boolean>} true bei Erfolg, false bei Fehler
 */
export async function performCopy(text, successMsg = 'Kopiert') {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('clipboard unavailable')
    }
    await navigator.clipboard.writeText(text)
    toast(successMsg, 'success')
    return true
  } catch {
    toast(FAIL_MSG, 'error')
    return false
  }
}

/**
 * @param {number} [resetMs=1500] - Dauer, die der transiente `copied`-State hält
 * @returns {{ copied: boolean, copy: (text: string, successMsg?: string) => Promise<boolean> }}
 */
export default function useCopyFeedback(resetMs = 1500) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(
    () => () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
    },
    [],
  )

  const copy = useCallback(
    async (text, successMsg = 'Kopiert') => {
      const ok = await performCopy(text, successMsg)
      if (ok && mountedRef.current) {
        setCopied(true)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) setCopied(false)
        }, resetMs)
      }
      return ok
    },
    [resetMs],
  )

  return { copied, copy }
}
