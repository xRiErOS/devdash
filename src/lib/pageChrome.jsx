import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * PageChrome (DD#82-r2) — der App-Shell-Sub-Header zeigt EINEN Seitentitel an
 * einer fixen Position (konstante Höhe), statt dass jede View ihren Titel selbst
 * an variierender y-Position/Größe rendert (Reject-Grund Runde 1: Titel-Sprung
 * beim View-Wechsel). Jede Layout-gescopete View publiziert ihren Titel via
 * usePageTitle(); der Sub-Header in Layout.jsx liest ihn via usePageChromeTitle().
 *
 * Path-Scoping: der publizierte Eintrag trägt den Pfad, für den er gilt. Beim
 * Navigieren auf einen neuen Pfad matcht der alte Eintrag nicht mehr → der Sub-
 * Header rendert leer (konstante Höhe, kein Layout-Sprung), bis die neue View
 * ihren Titel publiziert. So bleibt kein Titel der Vor-View stehen (kein Bleed),
 * ohne fragile Reset-on-unmount-Reihenfolge.
 */

const PageChromeContext = createContext(null)

/**
 * resolveChromeTitle — pure: liefert den anzuzeigenden Titel nur, wenn der
 * publizierte Eintrag zum aktuell sichtbaren Pfad gehört, sonst leer. Defensiv
 * gegen Nicht-String-Titel.
 * @param {{path: string, title: unknown}|null|undefined} entry
 * @param {string} pathname
 * @returns {string}
 */
export function resolveChromeTitle(entry, pathname) {
  if (!entry || entry.path !== pathname) return ''
  return typeof entry.title === 'string' ? entry.title : ''
}

export function PageChromeProvider({ children }) {
  const [entry, setEntry] = useState({ path: null, title: '' })
  return (
    <PageChromeContext.Provider value={{ entry, setEntry }}>
      {children}
    </PageChromeContext.Provider>
  )
}

/**
 * usePageTitle — eine Nav-View publiziert ihren Seitentitel für ihren aktuellen
 * Pfad. Kein Reset-on-unmount (last-write-wins, path-scoped). Leerer/auslassender
 * Titel ('' ) = bewusst kein Sub-Header-Titel auf dieser View.
 * @param {string} title
 */
export function usePageTitle(title) {
  const ctx = useContext(PageChromeContext)
  const { pathname } = useLocation()
  const setEntry = ctx?.setEntry
  useEffect(() => {
    if (!setEntry) return
    setEntry({ path: pathname, title: typeof title === 'string' ? title : '' })
  }, [setEntry, pathname, title])
}

/**
 * usePageChromeTitle — der Sub-Header liest den für den aktuellen Pfad gültigen
 * Titel (oder '' ).
 * @returns {string}
 */
export function usePageChromeTitle() {
  const ctx = useContext(PageChromeContext)
  const { pathname } = useLocation()
  return resolveChromeTitle(ctx?.entry, pathname)
}
