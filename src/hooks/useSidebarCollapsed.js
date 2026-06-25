// DD-282 (M3-S02 T02): Sidebar-Collapsed-State pro Projekt, localStorage-persistiert.
// Key: devd:home:sidebar:<projectId> → '1' (collapsed) | '0' (expanded).
// Default: expanded (false).

import { useEffect, useState, useCallback } from 'react'

function keyFor(projectId) {
  return `devd:home:sidebar:${projectId}`
}

function readLs(key) {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(key) } catch { return null }
}

function writeLs(key, value) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, value) } catch { /* quota */ }
}

export function useSidebarCollapsed(projectId) {
  const [collapsed, setCollapsed] = useState(() => {
    if (!projectId) return false
    return readLs(keyFor(projectId)) === '1'
  })

  useEffect(() => {
    if (!projectId) return
    setCollapsed(readLs(keyFor(projectId)) === '1')
  }, [projectId])

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      if (projectId) writeLs(keyFor(projectId), next ? '1' : '0')
      return next
    })
  }, [projectId])

  const setCollapsedExplicit = useCallback((v) => {
    setCollapsed(v)
    if (projectId) writeLs(keyFor(projectId), v ? '1' : '0')
  }, [projectId])

  return [collapsed, toggle, setCollapsedExplicit]
}

export const SIDEBAR_LS_PREFIX = 'devd:home:sidebar:'
