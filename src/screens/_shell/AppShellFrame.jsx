// src/screens/_shell/AppShellFrame.jsx
// Gebauter App-Shell (GF-2): komponiert die 05.80-Organismen (AppShell/AppShellRail/
// AppShellTopbar) + Outlet und VERDRAHTET sie über useShell (R6 Container-Concern) an
// Router/Daten/Hooks. Mountet die Overlays (ProjectQuickSwitcher, ShortcutsHelp) +
// AuthExpiredOverlay + ToastHost + F2-Debug-Panels (NotesPanel + DebugOverlay, PO-Review
// 2026-06-24): DebugProvider liegt in Providers.jsx (g+d toggelt, Alt+Klick→data-ui in
// Notes); State-Lift-Wrapper 1:1 aus der Alt-Shell views/AppShell.jsx gespiegelt (DD-472 T3E).
import { createPortal } from 'react-dom'
import { Outlet, useLocation } from 'react-router-dom'
import { Home, Map, ListTodo, Brain } from 'lucide-react'
import AppShell from '../../components/ui/organisms/AppShell.jsx'
import AppShellRail from '../../components/ui/organisms/AppShellRail.jsx'
import AppShellTopbar from '../../components/ui/organisms/AppShellTopbar.jsx'
import ProjectQuickSwitcher from '../../components/ui/organisms/ProjectQuickSwitcher.jsx'
import ShortcutsHelp from '../../components/ui/molecules/ShortcutsHelp.jsx'
import AuthExpiredOverlay from '../../components/ui/molecules/AuthExpiredOverlay.jsx'
import NotesPanel from '../../components/ui/organisms/NotesPanel.jsx'
import DebugOverlayView from '../../components/ui/molecules/DebugOverlay.jsx'
import { useDebug } from '../../contexts/DebugContext.jsx'
import { ToastHost } from './ToastHost.jsx'
import { RAIL_ITEMS } from './navItems.js'
import { useShell } from './useShell.js'
import { useProjectNav } from '../../lib/useProjectNav.js'

// railKey → Icon. Präsentation bleibt im Frame; navItems.js bleibt reine Daten
// (kein JSX in der Routen-Tabelle). roadmap erhält ein eigenes Icon (Map).
const RAIL_ICONS = { home: Home, roadmap: Map, backlog: ListTodo, memories: Brain }

// State-Lift für die Debug-Notes (1:1 aus views/AppShell.jsx, DD-472 T3B).
// autoSaveMs=0 hält notesRef.current aktuell für insertNote-Cursor (DebugContext).
function DebugNotesPanel() {
  const {
    enabled, note, status, notePosition, notesRef,
    setNote, copyNotes, onNotesPointerDown, onNotesPointerMove, onNotesPointerUp,
  } = useDebug()
  if (!enabled) return null
  if (typeof document === 'undefined') return null
  return createPortal(
    <NotesPanel
      value={note}
      onSave={setNote}
      onCopy={copyNotes}
      autoSaveMs={0}
      position={notePosition}
      statusLabel={status}
      dataUiScope="ui-debug.notes"
      textareaRef={notesRef}
      onDragPointerDown={onNotesPointerDown}
      onDragPointerMove={onNotesPointerMove}
      onDragPointerUp={onNotesPointerUp}
    />,
    document.body,
  )
}

// State-Lift für den DebugOverlay (1:1 aus views/AppShell.jsx, DD-472 T3E).
function DebugOverlay() {
  const { enabled, hover } = useDebug()
  if (!enabled) return null
  if (typeof document === 'undefined') return null
  const rect = hover?.rect ?? undefined
  const label = hover
    ? {
        left: Math.min(hover.x + 12, (typeof window !== 'undefined' ? window.innerWidth - 320 : 800)),
        top: Math.min(hover.y + 12, (typeof window !== 'undefined' ? window.innerHeight - 32 : 600)),
        text: hover.id,
      }
    : undefined
  return createPortal(
    <DebugOverlayView showIndicator rect={rect} label={label} />,
    document.body,
  )
}

export function AppShellFrame() {
  const shell = useShell()
  const navigate = useProjectNav()
  const { pathname } = useLocation()
  const segs = pathname.split('/').filter(Boolean)
  // Aktives Rail-Item = View-Segment hinter dem Projekt-Slug (z.B. /devd/backlog → backlog).
  const activeKey = segs[1] || ''

  // Route-abgeleiteter Breadcrumb (component-only, kein data_ui-Anker — C4-Leaf-Entscheid):
  // [Projekt-Slug | DevDash] › [View-Label]. Globale Routen (kein Slug) → nur Wurzel.
  const GLOBAL_FIRST = new Set(['projects', 'settings', 'memories'])
  const slug = segs[0] && !GLOBAL_FIRST.has(segs[0]) ? segs[0] : null
  const viewLabel = RAIL_ITEMS.find((r) => r.railKey === activeKey)?.label
  const breadcrumb = [slug || 'DevDash', ...(viewLabel ? [viewLabel] : [])]

  // RAIL_ITEMS (navItems.js, EINE Quelle) → präsentationale Rail-Items mit Icon +
  // Nav-Callback (IconSidebar-Präzedenz onClick) + active aus der Route. Ersetzt den
  // alten Cmp:()=>null-Bug (Rail-Kill).
  const railItems = RAIL_ITEMS.map((r) => ({
    key: r.railKey,
    Cmp: RAIL_ICONS[r.railKey],
    label: r.label,
    onClick: () => navigate(`/${r.path}`),
    active: r.railKey === activeKey,
  }))

  return (
    <>
      <AppShell
        rail={
          <AppShellRail
            items={railItems}
            collapsed={shell.railCollapsed}
            onToggleCollapsed={shell.toggleRail}
            onSettings={() => navigate('/settings')}
          />
        }
        topbar={
          <AppShellTopbar
            breadcrumb={breadcrumb}
            theme={shell.theme}
            searchValue={shell.searchValue}
            onSearchChange={(e) => shell.setSearchValue(e.target.value)}
            onSearchClear={shell.clearSearch}
            onSearchSubmit={shell.submitSearch}
            onQuickSwitcher={shell.openSwitcher}
            onShortcuts={shell.openShortcuts}
            onThemeToggle={shell.toggleTheme}
          />
        }
      >
        <Outlet />
      </AppShell>
      <ProjectQuickSwitcher
        open={shell.switcherOpen}
        projects={shell.switcherProjects}
        currentProjectId={shell.currentProjectId}
        onSelect={shell.pickProject}
        onOpenOverview={shell.openOverview}
        onClose={shell.closeSwitcher}
      />
      <ShortcutsHelp open={shell.shortcutsOpen} onClose={shell.closeShortcuts} />
      <AuthExpiredOverlay />
      <ToastHost />
      <DebugNotesPanel />
      <DebugOverlay />
    </>
  )
}
