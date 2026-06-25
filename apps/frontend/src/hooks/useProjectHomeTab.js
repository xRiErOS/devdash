// DD-282 (M3-S02 T02): Tab-State pro Projekt — URL ?tab= setzt initial, sonst
// localStorage devd:home:lastTab:<projectId>, sonst Default 'overview'. Bei
// Tab-Wechsel: URL replace + localStorage write.

import { useEffect, useState, useCallback, useRef } from 'react'

// DD-487 (T02): SOLL-Tab-Set (Storybook ProjectHome.stories TABS) — Settings raus
// (lebt global unter /settings/*), Todo raus (als ToDos-Card im Overview-Tab gefaltet,
// DD-486), Memories rein (embedded ProjectMemoryView).
// DD-666: Backlog + Roadmap raus — beide haben native AppShell-Views + Tastatur-
// Shortcuts ('b'/'r'); die eingebetteten Tabs waren redundant. Die TAB_IDS.includes()-
// Guards lassen ein gespeichertes/URL ?tab=backlog|roadmap nun auf den Default
// (overview) zurückfallen. SOLL-Tab-Set = overview/sstd/memory.
export const TAB_IDS = Object.freeze(['overview', 'sstd', 'memory'])
export const DEFAULT_TAB = 'overview'

function keyFor(projectId) {
  return `devd:home:lastTab:${projectId}`
}

function readLs(key) {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(key) } catch { return null }
}

function writeLs(key, value) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, value) } catch { /* quota */ }
}

/**
 * URL > localStorage > Default. Wird beim INITIAL Mount aufgerufen.
 */
export function resolveInitialTab(projectId, urlSearch) {
  if (urlSearch && typeof urlSearch === 'string') {
    const params = new URLSearchParams(urlSearch.startsWith('?') ? urlSearch.slice(1) : urlSearch)
    const fromUrl = params.get('tab')
    if (fromUrl && TAB_IDS.includes(fromUrl)) return fromUrl
  }
  return resolveTabForProject(projectId)
}

/**
 * B04-Fix: bei Project-Wechsel (mit potentiell stale URL) ignoriert URL und
 * liest nur localStorage → Default. URL ist nur beim INITIAL Mount autoritativ.
 */
export function resolveTabForProject(projectId) {
  if (projectId) {
    const stored = readLs(keyFor(projectId))
    if (stored && TAB_IDS.includes(stored)) return stored
  }
  return DEFAULT_TAB
}

export function useProjectHomeTab(projectId) {
  const [tab, setTabState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_TAB
    return resolveInitialTab(projectId, window.location.search)
  })
  const firstMountRef = useRef(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !projectId) return
    if (firstMountRef.current) {
      firstMountRef.current = false
      return
    }
    // B04: bei nachfolgenden projectId-Wechseln stale URL nicht honorieren.
    setTabState(resolveTabForProject(projectId))
  }, [projectId])

  const setTab = useCallback((next) => {
    if (!TAB_IDS.includes(next)) return
    setTabState(next)
    if (projectId) writeLs(keyFor(projectId), next)
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', next)
      window.history.replaceState(null, '', url.toString())
    }
  }, [projectId])

  return [tab, setTab]
}

export const TAB_LS_PREFIX = 'devd:home:lastTab:'
