// DD-463 (455b): Nav-Kollaps — alle drei Board-Modi in einen "Roadmap"-Eintrag.
// DD-498: Dependencies-Nav-Eintrag entfernt (Route + mod+d-Shortcut bleiben, D02),
// Fuß-Settings auf globale /settings umgestellt (D03), Theme-Toggle in den Header
// verlagert (D04 — Theme-State lebt jetzt im useTheme-Hook, Layout/PageHeader).
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Home, Settings, Menu, X, Inbox, Brain, LayoutDashboard, Columns3 } from 'lucide-react'
import { getActiveProjectId, getActiveSlug, subscribeProject } from '../lib/projectStore'

function NavIcon({ to, label, active, children, 'data-testid': testId, 'data-ui': dataUi }) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      data-ui={dataUi}
      data-testid={testId}
      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${active ? 'bg-[var(--surface1)] text-[var(--text)]' : 'text-[var(--subtext0)]'}`}
    >
      {children}
    </Link>
  )
}

// DD-74: Klick auf das Projekt-Icon oeffnet den zentralen ProjectQuickSwitcher
// (gleicher Modal wie 'q'-Shortcut).
function CompactProjectSwitcher() {
  const [projects, setProjects] = useState([])
  const [activeId, setActiveId] = useState(getActiveProjectId())
  const badgeRef = useRef(null)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects).catch(() => {})
  }, [])

  useEffect(() => subscribeProject(setActiveId), [])

  const active = projects.find(p => p.id === activeId)
  const label = active?.name || 'Projekt'

  useEffect(() => {
    if (!badgeRef.current) return
    badgeRef.current.style.setProperty('--badge-bg', active?.color || 'var(--overlay0)')
  }, [active?.color])

  const openSwitcher = () => {
    window.dispatchEvent(new CustomEvent('devd-open-project-switcher'))
  }

  return (
    <button
      onClick={openSwitcher}
      data-ui="app-shell.sidebar.project-switcher"
      title={`${label} — wechseln (q)`}
      aria-label={`Projekt: ${label}. Klicken zum Wechseln.`}
      className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-[var(--surface1)]"
    >
      <span
        ref={badgeRef}
        className="block w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold bg-[var(--badge-bg)] text-[var(--on-accent)]"
      >
        {active?.prefix?.slice(0, 2) || '··'}
      </span>
    </button>
  )
}

function SidebarBody({ onNavigate }) {
  const loc = useLocation()
  const { slug: routeSlug } = useParams()
  const slug = routeSlug || getActiveSlug()
  const p = (view) => (slug ? `/${slug}/${view}` : '/projects')
  const segs = loc.pathname.split('/').filter(Boolean)
  const viewSeg = segs.length >= 2 ? segs[1] : ''
  // DD-463: Roadmap-Eintrag zeigt aktiv für board/milestones/roadmap/review.
  const isRoadmap = viewSeg === 'board' || viewSeg === 'milestones' || viewSeg === 'roadmap' || viewSeg === 'review'
  const isProjectHome = viewSeg === 'home'
  return (
    <>
      <div className="flex flex-col items-center gap-2 pt-3 px-2">
        <div onClick={onNavigate}>
          <NavIcon to="/projects" label="Projekte" active={loc.pathname === '/projects'} data-ui="app-shell.sidebar.nav.projects">
            <LayoutDashboard size={18} strokeWidth={2} />
          </NavIcon>
        </div>
        <div className="h-px w-8 my-1 bg-[var(--surface0)]" />
        <CompactProjectSwitcher />
        <div className="h-px w-8 my-1 bg-[var(--surface0)]" />
        {/* DD-498: Reihenfolge — Project Home · Roadmap · Backlog · Memories
            (Dependencies-Eintrag entfernt, D02; Route + mod+d bleiben). */}
        <div onClick={onNavigate}>
          <NavIcon to={p('home')} label="Project Home" active={isProjectHome} data-ui="app-shell.sidebar.nav.home">
            <Home size={18} strokeWidth={2} />
          </NavIcon>
        </div>
        <div onClick={onNavigate}>
          <NavIcon to={p('board')} label="Roadmap" active={isRoadmap} data-ui="app-shell.sidebar.nav.roadmap" data-testid="nav-roadmap">
            <Columns3 size={18} strokeWidth={2} />
          </NavIcon>
        </div>
        <div onClick={onNavigate}>
          <NavIcon to={p('backlog')} label="Backlog" active={viewSeg === 'backlog'} data-ui="app-shell.sidebar.nav.backlog">
            <Inbox size={18} strokeWidth={2} />
          </NavIcon>
        </div>
        <div onClick={onNavigate}>
          <NavIcon to={p('memories')} label="Memories" active={viewSeg === 'memories'} data-ui="app-shell.sidebar.nav.memories">
            <Brain size={18} strokeWidth={2} />
          </NavIcon>
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pb-3 px-2">
        {/* DD-498 (D03): Fuß zeigt nur noch die GLOBALE Einstellungs-Seite. */}
        <div onClick={onNavigate}>
          <NavIcon to="/settings" label="Globale Einstellungen" active={loc.pathname === '/settings'} data-ui="app-shell.sidebar.nav.settings">
            <Settings size={18} strokeWidth={2} />
          </NavIcon>
        </div>
      </div>
    </>
  )
}

export default function IconSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop: feste Icon-Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-16 h-screen sticky top-0 shrink-0 bg-[var(--mantle)] border-r border-[var(--surface0)]"
        aria-label="Navigation"
        data-ui="app-shell.sidebar"
      >
        <SidebarBody />
      </aside>

      {/* Mobile: Burger-Button — DD-46 */}
      <button
        onClick={() => setDrawerOpen(true)}
        data-ui="app-shell.sidebar.mobile-open"
        aria-label="Navigation oeffnen"
        className="lg:hidden fixed top-3 left-3 z-30 flex items-center justify-center w-10 h-10 rounded-lg shadow-lg bg-[var(--mantle)] text-[var(--text)] border border-[var(--surface0)]"
      >
        <Menu size={18} />
      </button>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 devd-anim-fade bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-16 flex flex-col devd-anim-slide-left bg-[var(--mantle)] border-r border-[var(--surface0)]"
            aria-label="Navigation"
            role="dialog"
            aria-modal="true"
            data-ui="app-shell.sidebar.drawer"
          >
            <button
              onClick={() => setDrawerOpen(false)}
              data-ui="app-shell.sidebar.mobile-close"
              aria-label="Navigation schliessen"
              className="absolute top-1 right-1 rounded flex items-center justify-center w-8 h-8 text-[var(--subtext0)]"
            >
              <X size={16} />
            </button>
            <SidebarBody onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}
    </>
  )
}
