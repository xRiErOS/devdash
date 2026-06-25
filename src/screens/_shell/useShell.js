// src/screens/_shell/useShell.js
// Container-Hook (R6) der gebauten App-Shell: hebt allen Topbar-/Rail-/Overlay-State
// aus den präsentationalen Organismen heraus und verdrahtet sie an Daten/Router/Hooks.
// Spiegelt die Legacy-Verdrahtung aus src/components/ui/layout/Layout.jsx (DD-588),
// schlank für die greenfield _shell. Die 2-Strang-Such-Scope-Logik liegt als reine
// Funktion in searchScope.js (node-env-getestet).
import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import useTheme from '../../hooks/useTheme.js'
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js'
import { useProjectNav } from '../../lib/useProjectNav.js'
import { getActiveProjectId, setActiveProjectId, setActiveSlug } from '../../lib/projectStore.js'
import { searchScope } from './searchScope.js'

// View-Segmente, die beim Projektwechsel beibehalten werden (sonst /home). Deckt die
// 4 Rail-Quick-Access-Sektionen ab (Quelle navItems.js RAIL_ITEMS).
const VIEW_SEGMENTS = new Set(['home', 'roadmap', 'backlog', 'memories'])

export function useShell() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useProjectNav()
  const { pathname } = useLocation()

  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [switcherProjects, setSwitcherProjects] = useState([])

  // Projekt-Liste erst beim Öffnen laden (archivierte aus), 1:1 Layout DD-588.
  useEffect(() => {
    if (!switcherOpen) return
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSwitcherProjects((Array.isArray(d) ? d : []).filter((p) => !p.archived)))
      .catch(() => setSwitcherProjects([]))
  }, [switcherOpen])

  const openSwitcher = useCallback(() => setSwitcherOpen(true), [])
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), [])
  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  const toggleRail = useCallback(() => setRailCollapsed((c) => !c), [])
  const clearSearch = useCallback(() => setSearchValue(''), [])

  // Globale Shortcuts: q → Quick-Switcher, ? → Shortcuts-Hilfe (plain keys feuern
  // nicht im Form-Fokus — useKeyboardShortcuts). f bleibt der Such-Fokus (Topbar).
  useKeyboardShortcuts({
    q: () => setSwitcherOpen(true),
    '?': () => setShortcutsOpen(true),
  })

  // Projektwechsel: aktuelles View-Segment beibehalten, sonst /home (Layout DD-588).
  const pickProject = useCallback(
    (projectId) => {
      const target = switcherProjects.find((p) => p.id === projectId)
      setActiveProjectId(projectId)
      if (target?.slug) {
        setActiveSlug(target.slug)
        const segs = pathname.split('/').filter(Boolean)
        const viewSeg = VIEW_SEGMENTS.has(segs[1]) ? segs[1] : 'home'
        navigate(`/${target.slug}/${viewSeg}`)
      }
      setSwitcherOpen(false)
    },
    [switcherProjects, pathname, navigate],
  )

  const openOverview = useCallback(() => {
    navigate('/projects')
    setSwitcherOpen(false)
  }, [navigate])

  const scope = searchScope(pathname)

  // Such-Submit: berechnet den 2-Strang-Scope (searchScope, getestet). Die RESULTS-
  // Surface (Treffer-Rendering/Navigation) ist bewusst OUT-OF-SCOPE Schritt 6 — im
  // greenfield _shell existiert noch kein Such-Ergebnis-Screen (AppShell.contract.md
  // „Feature-Parität": app-shell.content-Platzhalter). Wiring + Scope-Entscheid sind real.
  const submitSearch = useCallback(
    (value) => {
      const q = (value ?? searchValue).trim()
      if (!q) return
      // TODO(GF-2 Such-Surface): GET /api/search?scope=<scope>&q=<q> → Ergebnis-Screen.
      // scope kommt aus shell.scope (searchScope, getestet) — Caller liest es separat.
    },
    [searchValue],
  )

  return {
    theme,
    toggleTheme,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    switcherProjects,
    currentProjectId: getActiveProjectId(),
    pickProject,
    openOverview,
    shortcutsOpen,
    openShortcuts,
    closeShortcuts,
    railCollapsed,
    toggleRail,
    searchValue,
    setSearchValue,
    clearSearch,
    submitSearch,
    scope,
  }
}
