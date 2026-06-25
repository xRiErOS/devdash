// DD-276 (M3-S01): Active-Project-Hook — fetcht den vollen Projekt-Datensatz
// (id, slug, name, prefix, ...) für die aktuell aktive ProjectId.
//
// Reagiert auf projectStore-Listener (Project-Switcher-Klick → re-fetch).
// Pflegt schlankes In-Memory-Cache, weil mehrere Views parallel den Hook nutzen.

import { useEffect, useState } from 'react'
import { getActiveProjectId, subscribeProject } from '../lib/projectStore.js'

const _cache = new Map() // id → project

export function clearActiveProjectCache() { _cache.clear() }

export function useActiveProject() {
  const [projectId, setProjectId] = useState(() => getActiveProjectId())
  const [project, setProject] = useState(() => _cache.get(projectId) || null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = subscribeProject(id => {
      setProjectId(id)
      setProject(_cache.get(id) || null)
    })
    return unsub
  }, [])

  useEffect(() => {
    const cached = _cache.get(projectId)
    if (cached) {
      setProject(cached)
      return
    }
    let cancelled = false
    fetch(`/api/projects/${projectId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        if (cancelled) return
        _cache.set(projectId, data)
        setProject(data)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
      })
    return () => { cancelled = true }
  }, [projectId])

  return { project, projectId, error }
}

/**
 * Hilfsfunktion: setzt document.title nach dem Pattern "DevD — <page> · <slug>".
 * Wirkt nur, wenn project geladen ist.
 */
export function useDocumentTitle(page, project) {
  useEffect(() => {
    // DD-343: Im Embed-Modus (page leer) den Browser-Titel NICHT überschreiben —
    // der einbettende View (z.B. ProjectHomeView) hält den Titel-Hoheit.
    if (!page) return
    const slug = project?.slug || ''
    document.title = slug ? `DevD — ${page} · ${slug}` : `DevD — ${page}`
  }, [page, project?.slug])
}
