// src/screens/_shell/AppShellFrame.jsx
// Handgebaute, dünne App-Hülle (DD2 MVP): NavigationRail (links) + Topbar (oben)
// + <Outlet/> (Content) + ToastHost. Komponiert die AKTUELLEN Organismen aus
// src/ui/organisms/complex — die Backup-Shell referenzierte alte AppShell*-Bauteile
// und war nicht portierbar.
//
// SSR-safe (Render-Smoke: renderToStaticMarkup, node-env): kein window/document
// im Render-Pfad, useEffect läuft im Smoke nicht. useProjectNav/useLocation sind
// Router-Hooks (laufen unter MemoryRouter im Test).
//
// Deferred (Folge-Tasks): CommandPalette-Wiring, ProjectQuickSwitcher,
// ShortcutsHelp, AuthExpiredOverlay, Debug-Panels (NotesPanel/DebugOverlay).
import { Outlet, useLocation } from 'react-router-dom'
import NavigationRail from '../../ui/organisms/complex/NavigationRail.jsx'
import Topbar from '../../ui/organisms/complex/Topbar.jsx'
import { ToastHost } from './ToastHost.jsx'
import { RAIL_ITEMS, RAIL_FOOT_ITEMS } from './navItems.js'
import { useProjectNav } from '../../lib/useProjectNav.js'

// Globale Top-Level-Segmente (kein Projekt-Slug davor).
const GLOBAL_FIRST = new Set(['projects', 'settings', 'memories'])

export function AppShellFrame() {
  const navigate = useProjectNav()
  const { pathname } = useLocation()
  const segs = pathname.split('/').filter(Boolean)

  // Slug = erstes Segment, sofern nicht global. Aktives Rail-Item = View-Segment
  // hinter dem Slug (z.B. /devd2/roadmap → roadmap). Bei globalen Routen kein Slug.
  const slug = segs[0] && !GLOBAL_FIRST.has(segs[0]) ? segs[0] : null
  const activeSegment = slug ? segs[1] || 'home' : segs[0] || ''

  // RAIL_ITEMS (navItems.js = eine Quelle) → NavigationRail-Items. `key` = Icon-
  // Registry-Key (NavigationRail nutzt it.key als iconName + React-Key).
  const railItems = RAIL_ITEMS.map((r) => ({
    key: r.icon,
    label: r.label,
    active: r.segment === activeSegment,
    onClick: () => navigate(`/${r.segment}`),
  }))
  const footItems = RAIL_FOOT_ITEMS.map((r) => ({
    key: r.icon,
    label: r.label,
    onClick: () => navigate(`/${r.segment}`, { global: true }),
  }))

  // Route-abgeleiteter Breadcrumb: [Slug | DevDash] › [View-Label].
  const viewLabel = RAIL_ITEMS.find((r) => r.segment === activeSegment)?.label
  const breadcrumb = [
    { label: slug || 'DevDash', last: !viewLabel },
    ...(viewLabel ? [{ label: viewLabel, last: true }] : []),
  ]

  return (
    <div data-ui="app-shell.frame" className="flex h-screen w-full bg-[var(--base)] text-[var(--text)] overflow-hidden">
      <NavigationRail items={railItems} footItems={footItems} dataUiScope="app-shell.rail" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar breadcrumb={breadcrumb} dataUiScope="app-shell.topbar" />
        <main data-ui="app-shell.content" className="flex-1 overflow-auto p-[var(--space-4)]">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
