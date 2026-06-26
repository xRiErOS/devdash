// src/screens/_shell/ProjectScope.jsx
// DD-368 (D01/R02): Projekt-Scope-Layout. Liest `:slug` aus der URL, löst ihn
// gegen /api/projects auf und setzt projectStore (ID + Slug) SYNCHRON, BEVOR
// die Kind-Routen rendern. Damit leitet apiClient den X-Project-Id-Header aus
// der URL ab (Single Source of Truth) — kein Header/URL-Mismatch (DD-Review 2026-06-24).
//
// Unbekannter Slug → <Navigate to="/projects" replace>. Rendert <Outlet/> erst
// nach erfolgreicher Auflösung.
//
// MVP-Boot (DD2): authGuard/AuthExpiredOverlay (DD-537) deferred — kein
// useAuthRequired-Import; Ladefehler zeigt generischen Text.

import { useEffect, useState } from 'react'
import { Outlet, Navigate, useParams } from 'react-router-dom'
import {
  getActiveProjectId,
  getActiveSlug,
  setActiveProjectId,
  setActiveSlug,
} from '../../lib/projectStore.js'

// Modul-Cache: slug → project (id, slug, …). Vermeidet Re-Fetch bei jedem
// Routenwechsel innerhalb desselben Projekts.
const _slugCache = new Map()

function ScopeFallback() {
  return (
    <p data-ui="screen:project-scope.loading" className="text-center py-[var(--space-7)] text-[var(--subtext0)]">
      Lade Projekt…
    </p>
  )
}

export default function ProjectScope() {
  const { slug } = useParams()

  // Synchroner Initial-State: ist der Slug bereits aufgelöst (Cache oder schon
  // aktiv), setzen wir den Store SOFORT, damit der erste Kind-Render bereits den
  // korrekten X-Project-Id-Header trägt.
  const [status, setStatus] = useState(() => {
    const cached = _slugCache.get(slug)
    if (cached) {
      setActiveProjectId(cached.id)
      setActiveSlug(cached.slug)
      return 'ready'
    }
    if (slug && getActiveSlug() === slug && getActiveProjectId() > 0) {
      return 'ready'
    }
    return 'loading'
  })

  useEffect(() => {
    if (!slug) {
      setStatus('not-found')
      return
    }
    const cached = _slugCache.get(slug)
    if (cached) {
      setActiveProjectId(cached.id)
      setActiveSlug(cached.slug)
      setStatus('ready')
      return
    }

    let cancelled = false
    setStatus('loading')
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((list) => {
        if (cancelled) return
        const arr = Array.isArray(list) ? list : []
        for (const p of arr) {
          if (p && p.slug) _slugCache.set(p.slug, p)
        }
        const match = arr.find((p) => p && p.slug === slug)
        if (!match) {
          setStatus('not-found')
          return
        }
        setActiveProjectId(match.id)
        setActiveSlug(match.slug)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (status === 'not-found') return <Navigate to="/projects" replace />
  if (status === 'error') {
    return (
      <p data-ui="screen:project-scope.error" className="text-center py-[var(--space-7)] text-[var(--accent-danger)]">
        Projekt „{slug}“ konnte nicht geladen werden.
      </p>
    )
  }
  if (status !== 'ready') return <ScopeFallback />
  return <Outlet />
}
