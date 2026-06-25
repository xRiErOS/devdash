/**
 * AppShell — Screen-Story (08.10 Shell). Die kanonische, VERDRAHTETE App-Shell
 * (05.80-Organismen AppShell + AppShellTopbar + AppShellRail) als komponierter Screen,
 * jetzt mit echter Router-Navigation + play-getriebenem Verhalten (Behavioral-Checkliste
 * Level-2, GF-2 Folge-Session 2026-06-25):
 *   - Rail-Items navigieren real (MemoryRouter) → View + Breadcrumb folgen der Route (T2/T5).
 *   - Quick-Switcher (DD-Logo) öffnet das ProjectQuickSwitcher-Panel; Projektwahl wechselt
 *     die Breadcrumb-Wurzel (T3).
 *   - Globale Suche → leichte Ergebnis-Liste (Mock-Treffer) → Klick navigiert zu IssueDetails
 *     (08.60-Fixture) im Content-Outlet (T4). Eigener greenfield Such-Screen bleibt out-of-scope
 *     (SSTD §7) — dies ist die play-Demo der Navigation, kein produktiver Such-Screen.
 *
 * State hier lokal (Story-Demo des Container-Concern useShell). Im echten App hebt
 * src/screens/_shell/useShell.js denselben State + verdrahtet Router/Daten produktiv (R6).
 *
 * Breadcrumb bewusst ≤2 Segmente (Breadcrumb-Molecule emittiert `breadcrumb.separator`
 * je i>0 → ≥3 Segmente = dataui-unique-Dup; SSTD-Lesson). status:review bis PO (DD-186).
 */
import { useState } from 'react'
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { within, userEvent, expect, waitFor } from 'storybook/test'
import AppShell from '../../../components/ui/organisms/AppShell.jsx'
import AppShellRail from '../../../components/ui/organisms/AppShellRail.jsx'
import AppShellTopbar from '../../../components/ui/organisms/AppShellTopbar.jsx'
import ProjectQuickSwitcher from '../../../components/ui/organisms/ProjectQuickSwitcher.jsx'
import IssueDetails from '../../../components/ui/organisms/IssueDetails.jsx'
import NavItem from '../../../components/ui/molecules/NavItem.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'
import { ISSUE_DETAIL, SEARCH_HITS } from '../08.60-issues/issueDetails.fixture.js'

const meta = {
  title: '08 SCREENS/08.10 Shell/AppShell',
  component: AppShell,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:open', 'domain:shell', 'design_version:v2'],
  parameters: { layout: 'fullscreen', fullBleed: true },
}
export default meta

// Rail-Items = navItems-Vertrag (4 Quick-Access, EINE Quelle). Icons via Registry
// (Insel-Regel 5: kein roher lucide-Import im Story-File). railKey → Registry-Key.
const railIcon = (iconName) =>
  function RailIcon({ size }) {
    return <Icon name={iconName} size={size} mono />
  }
const RAIL = [
  { key: 'home', path: 'home', label: 'Home', short: 'h', Cmp: railIcon('home') },
  { key: 'roadmap', path: 'roadmap', label: 'Roadmap', short: 'r', Cmp: railIcon('roadmap') },
  { key: 'backlog', path: 'backlog', label: 'Backlog', short: 'b', Cmp: railIcon('backlog') },
  { key: 'memories', path: 'memories', label: 'Memories', short: 'm', Cmp: railIcon('brain') },
]

// Mock-Projekte für den Quick-Switcher (Farben als Token, kein Roh-Hex).
const PROJECTS = [
  { id: 1, name: 'My Baby Tracker', slug: 'mybaby', prefix: 'MBT', color: 'var(--accent-info)' },
  { id: 2, name: 'DevDashboard', slug: 'devd', prefix: 'DD', color: 'var(--accent-primary)' },
  { id: 3, name: 'Selene', slug: 'selene', prefix: 'SEL', color: 'var(--overlay1)' },
]

const VIEW_LABEL = { '': 'Home', home: 'Home', roadmap: 'Roadmap', backlog: 'Backlog', memories: 'Memories', projects: 'Projekte' }

// Breadcrumb route-abgeleitet (T5), ≤2 Segmente: [Projekt, View | issueId].
function deriveBreadcrumb(pathname, projectName) {
  const seg = pathname.replace(/^\//, '').split('/')
  if (seg[0] === 'issues' && seg[1]) return [projectName, seg[1]]
  return [projectName, VIEW_LABEL[seg[0]] ?? 'Home']
}

function ViewPanel({ label }) {
  return (
    <div data-ui={`screen.app-shell.view.${label.toLowerCase()}`} className="p-4">
      <h1 className="text-xl font-bold text-[var(--text)]">{label}</h1>
      <p className="mt-2 text-sm text-[var(--subtext1)]">Content-Outlet der Route {label}.</p>
    </div>
  )
}

function ShellInner({ collapsedInit = false }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [theme, setTheme] = useState('dark')
  const [collapsed, setCollapsed] = useState(collapsedInit)
  const [search, setSearch] = useState('')
  const [qsOpen, setQsOpen] = useState(false)
  const [project, setProject] = useState(PROJECTS[1])

  const railItems = RAIL.map((r) => ({
    ...r,
    onClick: () => { setSearch(''); navigate(`/${r.path}`) },
    active: pathname === `/${r.path}` || (r.path === 'home' && pathname === '/'),
  }))

  const q = search.trim().toLowerCase()
  const hits = q ? SEARCH_HITS.filter((h) => h.title.toLowerCase().includes(q) || h.issueId.toLowerCase().includes(q)) : []
  const breadcrumb = deriveBreadcrumb(pathname, project.name)

  function pickResult(issueId) { setSearch(''); navigate(`/issues/${issueId}`) }

  const topbar = (
    <AppShellTopbar
      theme={theme}
      breadcrumb={breadcrumb}
      searchValue={search}
      onSearchChange={(e) => setSearch(e.target.value)}
      onSearchClear={() => setSearch('')}
      onSearchSubmit={() => { if (hits[0]) pickResult(hits[0].issueId) }}
      onQuickSwitcher={() => setQsOpen((o) => !o)}
      onShortcuts={() => {}}
      onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
    />
  )
  const rail = (
    <AppShellRail items={railItems} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
  )

  return (
    <AppShell topbar={topbar} rail={rail}>
      <div data-ui="screen.app-shell.content-body" className="relative h-full [font-family:var(--font-display)]">
        {qsOpen ? (
          <div data-ui="screen.app-shell.quick-switcher" className="absolute left-2 top-2 z-20 w-80">
            <ProjectQuickSwitcher
              open
              projects={PROJECTS}
              currentProjectId={project.id}
              onSelect={(id) => { const p = PROJECTS.find((x) => x.id === id); if (p) setProject(p); setQsOpen(false) }}
              onOpenOverview={() => { setQsOpen(false); navigate('/projects') }}
              onCreateNew={() => setQsOpen(false)}
              onClose={() => setQsOpen(false)}
            />
          </div>
        ) : null}

        {q ? (
          <div data-ui="screen.app-shell.search-results" className="absolute right-2 top-2 z-20 w-80 rounded-[var(--radius-sm)] border border-[var(--surface1)] bg-[var(--layer-1)] p-2 shadow-lg">
            <p className="px-2 pb-1 text-xs text-[var(--subtext0)]">{hits.length} Treffer für {search}</p>
            {hits.map((h) => (
              <NavItem
                key={h.issueId}
                data-ui={`screen.app-shell.search-result.${h.issueId}`}
                onClick={() => pickResult(h.issueId)}
                icon={<Icon name="hash" size={14} mono />}
              >
                <span className="truncate">{h.issueId} · {h.title}</span>
              </NavItem>
            ))}
            {!hits.length ? (
              <p data-ui="screen.app-shell.search-empty" className="px-2 py-1 text-sm text-[var(--subtext0)]">Keine Treffer.</p>
            ) : null}
          </div>
        ) : null}

        <Routes>
          <Route index element={<ViewPanel label="Home" />} />
          <Route path="home" element={<ViewPanel label="Home" />} />
          <Route path="roadmap" element={<ViewPanel label="Roadmap" />} />
          <Route path="backlog" element={<ViewPanel label="Backlog" />} />
          <Route path="memories" element={<ViewPanel label="Memories" />} />
          <Route path="projects" element={<ViewPanel label="Projekte" />} />
          <Route
            path="issues/:id"
            element={
              <div data-ui="screen.app-shell.issue-view" className="h-full">
                <IssueDetails data={ISSUE_DETAIL} />
              </div>
            }
          />
        </Routes>
      </div>
    </AppShell>
  )
}

function Shell({ name = 'default', initialPath = '/', collapsedInit = false }) {
  return (
    <div data-ui={`screen.app-shell.${name}`} className="h-full">
      <MemoryRouter initialEntries={[initialPath]}>
        <ShellInner collapsedInit={collapsedInit} />
      </MemoryRouter>
    </div>
  )
}

export const Default = { render: () => <Shell name="default" initialPath="/" /> }

export const Main = { render: () => <Shell name="main" initialPath="/backlog" /> }

export const Variant_Collapsed = {
  name: 'Variant · Rail collapsed (icon-only)',
  render: () => <Shell name="collapsed" collapsedInit />,
}

// Behavioral-QA (Level-2, play): Topbar-Controls + Rail-Toggle feuern und ändern State.
export const Interaction_Wiring = {
  name: 'Interaction · Controls verdrahtet',
  render: () => <Shell name="wiring" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Theme-Toggle: dark (Sun) → click → light (Moon).
    expect(canvasElement.querySelector('.lucide-sun')).toBeTruthy()
    await userEvent.click(canvas.getByLabelText('Theme wechseln'))
    expect(canvasElement.querySelector('.lucide-moon')).toBeTruthy()
    // Rail-Toggle: einklappen → Label wechselt auf „aufklappen".
    await userEvent.click(canvas.getByLabelText('Rail einklappen'))
    expect(canvas.getByLabelText('Rail aufklappen')).toBeTruthy()
  },
}

// T2/T5 — Rail-Navigation route-getrieben: Klick wechselt View UND Breadcrumb.
export const Interaction_RailNav = {
  name: 'Interaction · Rail-Navigation (route-getrieben)',
  render: () => <Shell name="rail-nav" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvasElement.querySelector('[data-ui="app-shell.rail.item.roadmap"]'))
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="screen.app-shell.view.roadmap"]')).toBeTruthy())
    // Breadcrumb spiegelt die Route (≥1 „Roadmap" sichtbar: View-Titel + Breadcrumb).
    await waitFor(() => expect(canvas.getAllByText('Roadmap').length).toBeGreaterThan(0))
    await userEvent.click(canvasElement.querySelector('[data-ui="app-shell.rail.item.memories"]'))
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="screen.app-shell.view.memories"]')).toBeTruthy())
  },
}

// T3 — Quick-Switcher: DD-Logo öffnet Panel, Projektwahl wechselt Breadcrumb-Wurzel.
export const Interaction_QuickSwitcher = {
  name: 'Interaction · Quick-Switcher öffnen + Projekt wählen',
  render: () => <Shell name="switcher" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText('Quick-Switcher (q)'))
    const panel = await waitFor(() => {
      const el = canvasElement.querySelector('[data-ui="screen.app-shell.quick-switcher"]')
      expect(el).toBeTruthy()
      return el
    })
    await userEvent.click(await within(panel).findByText('Selene'))
    // Panel schließt, Breadcrumb-Wurzel = gewähltes Projekt.
    await waitFor(() => expect(canvas.getAllByText('Selene').length).toBeGreaterThan(0))
  },
}

// T4 — Suche → Ergebnis → IssueDetails: Eingabe filtert, Klick navigiert ins Detail.
export const Interaction_Search = {
  name: 'Interaction · Suche → Ergebnis → IssueDetails',
  render: () => <Shell name="search" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByPlaceholderText('Suchen…')
    await userEvent.type(input, 'Tastatur')
    const result = await waitFor(() => {
      const el = canvasElement.querySelector('[data-ui="screen.app-shell.search-result.DD-251"]')
      expect(el).toBeTruthy()
      return el
    })
    await userEvent.click(result)
    // IssueDetails rendert im Content-Outlet (Titel sichtbar, Such-Panel weg).
    await waitFor(() => {
      const view = canvasElement.querySelector('[data-ui="screen.app-shell.issue-view"]')
      expect(view).toBeTruthy()
      expect(within(view).getAllByText(/Tastatur-Navigation/).length).toBeGreaterThan(0)
    })
  },
}
