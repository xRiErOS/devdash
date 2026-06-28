// DD-368 (R01): Slug-aware Navigation-Helper.
//
// Liefert ein `navigate`, das projekt-gescopete Pfade automatisch den aktiven
// Projekt-Slug voranstellt. Der Slug kommt primär aus dem URL-Param `:slug`
// (ProjectScope) und fällt auf den projectStore zurück.
//
// Verwendung:
//   const navigate = useProjectNav()
//   navigate('/backlog')        → /:slug/backlog
//   navigate('/issues/42')      → /:slug/issues/42
//   navigate(-1)                → History-Delta unverändert
//   navigate('/settings', { global: true }) → /settings (kein Slug)
//   navigate('/projects')       → bleibt global (Top-Level erkannt)

import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getActiveSlug } from './projectStore.js'

// Top-Level-Routen ohne Projekt-Slug. Wird ein Pfad mit einem dieser Segmente
// begonnen, prefixt useProjectNav NICHT.
const GLOBAL_FIRST_SEGMENTS = new Set([
  'projects', // Legacy-Alias → redirect zu /home
  'settings',
  'memories', // /memories/global
])

/**
 * Prefix einen App-internen Pfad mit dem aktiven Projekt-Slug, sofern er
 * projekt-gescopet ist. Pure Funktion — für Tests direkt aufrufbar.
 *
 * @param {string} to     z.B. '/backlog' oder '/issues/42'
 * @param {string|null} slug aktiver Projekt-Slug
 * @param {object} [opts]  { global?: boolean, scoped?: boolean }
 * @returns {string} der finale Pfad
 */
export function withProjectSlug(to, slug, opts = {}) {
  if (typeof to !== 'string') return to
  if (opts.global) return to
  // Externe / absolute URLs unangetastet lassen.
  if (/^[a-z]+:\/\//i.test(to)) return to
  if (!to.startsWith('/')) return to // relative Pfade nicht anfassen

  const firstSeg = to.split('/')[1] || ''
  // `scoped: true` erzwingt das Prefixing auch für Segmente, die sonst als
  // global gelten (z.B. /settings → /:slug/settings = Projekt-Settings).
  if (!opts.scoped && GLOBAL_FIRST_SEGMENTS.has(firstSeg)) return to

  if (!slug) return to // kein Slug bekannt → unverändert (Caller fällt ggf. zurück)

  // Bereits gescopet? (erstes Segment == aktiver Slug) → nicht doppelt prefixen.
  if (firstSeg === slug) return to

  const rest = to === '/' ? '/home' : to
  return `/${slug}${rest}`
}

export function useProjectNav() {
  const navigate = useNavigate()
  const params = useParams()
  const slug = params.slug || getActiveSlug()

  return useCallback(
    (to, options) => {
      // History-Delta (navigate(-1)/navigate(1)) unverändert durchreichen.
      if (typeof to === 'number') return navigate(to)
      const { global, scoped, ...navOptions } = options || {}
      return navigate(withProjectSlug(to, slug, { global, scoped }), navOptions)
    },
    [navigate, slug]
  )
}
