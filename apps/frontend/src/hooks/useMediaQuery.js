import { useState, useEffect } from 'react'

/**
 * useMediaQuery — reaktiver Media-Query-Match (DD-635 / F3). Wird genutzt, um die
 * responsive Detail-Präsentation per CONDITIONAL MOUNT umzuschalten (Vollbild <1024
 * vs. Two-Pane ≥1024) statt per CSS-display-Swap — so existiert immer nur EIN
 * Detail-Baum im DOM (keine doppelten data-ui/data-testid-Anker, kein Playwright-
 * Strict-Mode-Bruch). E01/DD-528: bei ≥1024 mountet der Two-Pane vollständig (kein
 * kollabierender Hidden-Pane).
 *
 * @param {string} query - CSS-Media-Query, z.B. '(min-width: 1024px)'
 * @param {boolean} [defaultValue=false] - SSR-/Pre-Hydration-Default
 * @returns {boolean} matched
 */
export default function useMediaQuery(query, defaultValue = false) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return defaultValue
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
