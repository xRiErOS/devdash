import { useState, useEffect, useRef, useMemo } from 'react'
import { Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useProjectNav } from '../../../lib/useProjectNav.js'
import { Search, X, CircleHelp, Sun, Moon, Home, LayoutDashboard, Columns3, Inbox, Brain, Settings, FilePlus2, ClipboardCheck, LayoutGrid } from 'lucide-react'
import IconSidebar from '../organisms/IconSidebar.jsx'
import NavRail from '../organisms/NavRail.jsx'
import BottomTabBar from '../organisms/BottomTabBar.jsx'
import FabRadial from '../organisms/FabRadial.jsx'
import ShortcutsHelp from '../molecules/ShortcutsHelp.jsx'
import IssueCreateModal from '../organisms/IssueCreateModal.jsx'
import TagMultiSelect from '../molecules/TagMultiSelect.jsx'
import AttachmentDropzone, { AttachmentGallery } from '../molecules/AttachmentDropzone.jsx'
import useKeyboardShortcuts from '../../../hooks/useKeyboardShortcuts.js'
import { subscribeProject, getActiveProjectId, getActiveSlug, setActiveProjectId, setActiveSlug } from '../../../lib/projectStore.js'
import UiProjectQuickSwitcher from '../organisms/ProjectQuickSwitcher.jsx'
import UiProjectCreateModal from '../organisms/ProjectCreateModal.jsx'
import Modal from '../molecules/Modal.jsx'
import CommandPalette from '../organisms/CommandPalette.jsx'
import ShellBreadcrumb from '../organisms/ShellBreadcrumb.jsx'
import useTheme from '../../../hooks/useTheme.js'
import { ConfirmDialogProvider } from '../../../contexts/ConfirmDialogContext.jsx'
import { PageChromeProvider, usePageChromeTitle } from '../../../lib/pageChrome.jsx'
import PageTitle from '../atoms/PageTitle.jsx'

const SEARCH_DEBOUNCE_MS = 200

// DD-634 (F2, FEAT-24): Command-Palette-Container — die EINZIGE Such-/Sprung-
// Surface (D02). Client-seitige Aggregation der drei List-Endpoints des aktiven
// Projekts (PO-D DD74-D05 — kein neuer API-Endpoint), projiziert via
// CommandPalette (groupResultsByType). Löst die Inline-Header-Suche (DD-533) ab;
// geöffnet via ⌘K, f und den palette-Bottom-Tab. Treffer-Tap navigiert + schließt.
const PALETTE_PER_TYPE = 6

function CommandPaletteContainer({ open, onClose }) {
  const navigate = useProjectNav()
  const [query, setQuery] = useState('')
  const [data, setData] = useState({ milestones: [], sprints: [], issues: [] })
  const [projectId, setProjectId] = useState(getActiveProjectId())

  useEffect(() => subscribeProject(setProjectId), [])

  // Daten erst laden, wenn die Palette geöffnet ist (kein Fetch im Idle-Header).
  // Bare fetch trägt via apiClient-Interceptor den X-Project-Id-Header → projekt-scoped.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    Promise.all([
      fetch('/api/milestones').then(r => (r.ok ? r.json() : [])),
      fetch('/api/sprints').then(r => (r.ok ? r.json() : [])),
      fetch('/api/backlog').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([m, s, b]) => {
        if (cancelled) return
        setData({
          milestones: Array.isArray(m) ? m : [],
          sprints: Array.isArray(s) ? s : [],
          issues: Array.isArray(b) ? b : [],
        })
      })
      .catch(() => { if (!cancelled) setData({ milestones: [], sprints: [], issues: [] }) })
    return () => { cancelled = true }
  }, [open, projectId])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const has = (...vals) => vals.some(v => v && String(v).toLowerCase().includes(q))
    const out = []
    let n = 0
    for (const m of data.milestones) {
      if (has(m.name)) { out.push({ type: 'milestone', id: m.id, title: m.name, status: m.status }); if (++n >= PALETTE_PER_TYPE) break }
    }
    n = 0
    for (const s of data.sprints) {
      if (has(s.name, s.key)) { out.push({ type: 'sprint', id: s.id, key: s.key, title: s.name, status: s.status }); if (++n >= PALETTE_PER_TYPE) break }
    }
    n = 0
    for (const b of data.issues) {
      // B01 (DD-497-QA): Issue-Route resolved :id als project_number (DD-378), NICHT
      // globale backlog.id. `num` für die Navigation, `id` bleibt stabiler React/data-ui-Key.
      if (has(b.title, b.key)) { out.push({ type: 'issue', id: b.id, num: b.project_number ?? b.id, key: b.key, title: b.title, status: b.status }); if (++n >= PALETTE_PER_TYPE) break }
    }
    return out
  }, [query, data])

  const onSelect = (r) => {
    setQuery('')
    if (r.type === 'milestone') navigate(`/milestones/${r.id}`)
    else if (r.type === 'sprint') navigate(`/sprints/${r.id}`)
    else navigate(`/issues/${r.num ?? r.id}`)
  }

  return (
    <CommandPalette
      open={open}
      onClose={onClose}
      value={query}
      onChange={setQuery}
      results={results}
      onSelect={onSelect}
    />
  )
}

// DD-352: Globaler Page-Header — Slug-Breadcrumb (Projektkontext aus DD-368) +
// Aktions-Icons rechts: „?" öffnet die Tastenkürzel-Hilfe, Zahnrad führt zu den
// GLOBALEN Settings (DD-348 D02 / 12a). Projekt-Settings bleiben über die
// IconSidebar + 'p'-Shortcut erreichbar. Liegt im Layout, erscheint damit auf
// allen /:slug/<view>-Seiten (inkl. Projekt-Settings, AC#2).
//
// DD-670: Die View-Suche lebt jetzt im rechten Aktions-Cluster des Page-Headers
// (Reihenfolge: Suche → Hilfe → Theme), NICHT mehr in der SubHeader-Leiste. Sie
// wird NUR auf den durchsuchbaren Views (board/backlog/milestones/dependencies/
// review) gezeigt; auf allen anderen Views fehlt der Such-Block schlicht. Die
// ⌘K-Command-Palette (DD-634) ist unberührt — sie ist eine eigene Such-Surface.
function PageHeader({
  onHelp,
  theme,
  onToggleTheme,
  showSearch,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearchClear,
  searchInputRef,
}) {
  // Header-Aufbau (SOLL Screens/App-Shell): links Entity-Breadcrumb (DD-495/497),
  // rechts View-Suche (DD-670), Shortcuts-Hilfe und Theme-Toggle (DD-498, D04 — aus
  // dem Sidebar-Fuß hierher verlagert). Das DD-Logo lebt seit DD-664 in der Sidebar/
  // NavRail (Projekt-Switcher-Bereich), nicht mehr im Header.
  return (
    <div
      className="flex items-center justify-between gap-3 px-6 h-16 bg-[var(--base)] border-b border-b-[var(--surface0)]"
      data-ui="app-shell.page-header"
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* DD-535: Inline-Breadcrumb nur ab lg — auf <lg steht sie in der eigenen
            Zeile unter dem Header (siehe Layout app-shell.mobile-breadcrumb). */}
        <div className="hidden lg:flex min-w-0">
          <ShellBreadcrumb />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* DD-670: View-Suche im Header — nur auf durchsuchbaren Views. 16px-Font
            (iOS-Zoom-Guard), min 44px Touch-Target, Catppuccin-Tokens. */}
        {showSearch && (
          <div className="relative w-44 sm:w-56">
            <input
              type="search"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              aria-label="Issues durchsuchen"
              className="w-full pl-8 pr-7 rounded-lg outline-none border-0 bg-[var(--surface0)] text-[var(--text)]"
              style={{ fontSize: '16px', minHeight: '44px' }}
              data-ui="app-shell.page-header.search"
            />
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--hint)]"
            />
            {searchValue && (
              <button
                type="button"
                onClick={onSearchClear}
                aria-label="Suche zuruecksetzen"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-[var(--hint)] hover:bg-[var(--surface1)]"
                data-ui="app-shell.page-header.search-clear"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onHelp}
          title="Tastenkuerzel (?)"
          aria-label="Tastenkuerzel anzeigen"
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface0)]"
          style={{ width: '36px', height: '36px', color: 'var(--subtext0)' }}
          data-ui="app-shell.page-header.shortcuts"
        >
          <CircleHelp size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Dunkles Design' : 'Helles Design'}
          aria-label={theme === 'light' ? 'Dunkles Design' : 'Helles Design'}
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface0)]"
          style={{ width: '36px', height: '36px', color: 'var(--subtext0)' }}
          data-ui="app-shell.page-header.theme-toggle"
        >
          {theme === 'light' ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}

// DD-670/DD#82-r2: SubHeader ist die UNIFORME Leiste auf ALLEN Views (gleiche
// Höhe/Border/Hintergrund → kein Layout-Sprung beim View-Wechsel). Seit DD#82-r2
// trägt sie den EINEN Seitentitel an fixer Position (links, PageTitle-Atom): jede
// View publiziert ihren Titel via usePageTitle(); hier wird er via
// usePageChromeTitle() gelesen. Konstante Mindesthöhe → die y-Position des Titels
// ist auf jeder View identisch, auch wenn der Titel-Text spät lädt (dann rendert
// die Leiste kurz leer, springt aber nicht). Suche bleibt im Page-Header (DD-670).
function SubHeader() {
  const title = usePageChromeTitle()
  return (
    <div
      className="flex items-center gap-3 px-6 min-h-[2.75rem] bg-[var(--mantle)] border-b border-b-[var(--surface0)]"
      data-ui="app-shell.sub-header"
    >
      {title ? (
        // truncate + min-w-0: der Titel bleibt EINZEILIG → konstante Sub-Header-
        // Höhe auf jeder View und jedem Breakpoint (lange Titel brechen sonst auf
        // <lg um und variieren die Höhe). Voller Titel steht im Browser-Tab.
        <PageTitle as="h1" className="min-w-0 truncate" data-ui="app-shell.sub-header.title">{title}</PageTitle>
      ) : null}
    </div>
  )
}

// DD-670: '/' fokussiert die in den Page-Header verlagerte View-Suche; die
// globale Suche ('f' / ⌘K) öffnet weiterhin die Command-Palette (DD-634, D02).
function focusSearch() {
  const el = document.querySelector('[data-ui="app-shell.page-header.search"]')
  if (el) { el.focus(); return true }
  return false
}

// DD-157 R3: globaler Toast für Fehler-Feedback ohne Hover-Tooltip.
// Andere Components emitten window.dispatchEvent(new CustomEvent('devd-toast', {
//   detail: { message, kind }
// })). 'kind' ∈ 'error'|'info'|'success'.
function ToastHost() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const onToast = (e) => {
      const { message, kind = 'info' } = e.detail || {}
      if (!message) return
      const id = `${Date.now()}-${Math.random()}`
      setToasts(t => [...t, { id, message, kind }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
    }
    window.addEventListener('devd-toast', onToast)
    return () => window.removeEventListener('devd-toast', onToast)
  }, [])
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm" data-ui="app-shell.toast-host">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          data-ui={`app-shell.toast-host.toast.${t.id}`}
          className="px-4 py-2.5 rounded-lg shadow-2xl text-sm font-medium"
          style={{
            background: t.kind === 'error' ? 'var(--red)' : t.kind === 'success' ? 'var(--green)' : 'var(--surface1)',
            color: t.kind === 'error' || t.kind === 'success' ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// DD-588: Beim Projektwechsel das aktuelle View-Segment beibehalten, sonst /home.
// Repliziert die VIEW_SEGMENTS-Logik aus dem legacy ProjectQuickSwitcher-Container.
const VIEW_SEGMENTS = new Set([
  'home', 'board', 'backlog', 'milestones', 'roadmap', 'dependencies', 'memories', 'trash', 'settings',
])

// DD-589: Tag-Farben (synchron mit server/api.js + Migration 011). Create-Flow
// picked wie die legacy components/TagMultiSelect.jsx eine Zufallsfarbe.
const TAG_COLORS = ['blue', 'green', 'peach', 'mauve', 'teal', 'overlay0']

export default function Layout() {
  const [helpOpen, setHelpOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  // DD-633 (F1 Slice B): FAB-Radial offen/zu (ephemerer Mobile-UI-State).
  const [fabOpen, setFabOpen] = useState(false)
  // DD-634 (F2): Command-Palette offen/zu — einzige Such-/Sprung-Surface (D02).
  const [paletteOpen, setPaletteOpen] = useState(false)
  // DD-588: IssueCreateModal cutover — container state lifted from legacy modal
  const [issueCreating, setIssueCreating] = useState(false)
  const [issueCreateError, setIssueCreateError] = useState('')
  const [issueTagIds, setIssueTagIds] = useState([])
  const [issuePendingFiles, setIssuePendingFiles] = useState([])
  // DD-589: ui/ TagMultiSelect ist präsentational — Tag-Optionen + Create-Flow
  // aus der legacy components/TagMultiSelect.jsx in den Container gehoben.
  const [tagOptions, setTagOptions] = useState([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const toTagOption = (t) => ({ value: t.id, label: t.name, color: t.color, meta: t.usage_count != null ? `${t.usage_count}×` : undefined })
  useEffect(() => {
    let cancelled = false
    setTagsLoading(true)
    fetch('/api/tags')
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (cancelled) return
        setTagOptions(Array.isArray(data) ? data.map(toTagOption) : [])
        setTagsLoading(false)
      })
      .catch(() => { if (!cancelled) setTagsLoading(false) })
    return () => { cancelled = true }
  }, [])
  // onCreate: legt Tag an (Zufallsfarbe wie Quelle), ergänzt die Optionen
  // (sortiert) und übernimmt ihn in die aktuelle Issue-Selektion.
  const handleCreateTag = async (name) => {
    const clean = (name || '').trim()
    if (!clean) return
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] }),
      })
      if (!res.ok) return
      const created = await res.json()
      setTagOptions(prev => [...prev, toTagOption(created)].sort((a, b) => String(a.label).localeCompare(String(b.label))))
      setIssueTagIds(prev => [...prev, created.id])
    } catch { /* still */ }
  }
  // DD-588: ProjectQuickSwitcher + ProjectCreateModal cutover — container state lifted
  const [switcherProjects, setSwitcherProjects] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [projectCreating, setProjectCreating] = useState(false)
  const [projectCreateError, setProjectCreateError] = useState('')

  const handleIssueClose = () => {
    setIssueModalOpen(false)
    setIssueCreateError('')
    setIssueTagIds([])
    setIssuePendingFiles(prev => {
      prev.forEach(p => p.preview && URL.revokeObjectURL(p.preview))
      return []
    })
  }

  const handleIssueCreate = async ({ title, type, priority, po_notes, tag_ids, status, assigned_sprint }) => {
    setIssueCreating(true)
    setIssueCreateError('')
    try {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, priority, po_notes, tag_ids, status, assigned_sprint }),
      })
      if (!res.ok) throw new Error(await res.text())
      const newIssue = await res.json()
      if (issuePendingFiles.length) {
        const fd = new FormData()
        for (const p of issuePendingFiles) fd.append('files', p.file)
        try {
          const aRes = await fetch(`/api/backlog/${newIssue.id}/attachments`, { method: 'POST', body: fd })
          if (aRes.ok) {
            const created = await aRes.json()
            newIssue.attachments = created
          }
        } catch {}
      }
      handleIssueClose()
      window.dispatchEvent(new CustomEvent('devd-backlog-changed'))
    } catch (err) {
      setIssueCreateError(err.message || 'Fehler beim Erstellen')
    } finally {
      setIssueCreating(false)
    }
  }
  // DD-498: Theme-State lebt jetzt zentral hier (aus der IconSidebar gelöst), damit
  // der Header-Toggle ihn steuert; Persistenz unverändert (localStorage + data-theme).
  const { theme, toggleTheme } = useTheme()
  // DD-368: slug-aware navigate — prefixt projekt-gescopete Pfade automatisch.
  const navigate = useProjectNav()

  // DD-588: ProjectQuickSwitcher container-Logik (lifted from legacy ProjectQuickSwitcher.jsx).
  // Projekt-Liste erst beim Öffnen laden (archivierte ausgeblendet) — wie zuvor.
  useEffect(() => {
    if (!switcherOpen) return
    fetch('/api/projects')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setSwitcherProjects((Array.isArray(d) ? d : []).filter(p => !p.archived)))
      .catch(() => setSwitcherProjects([]))
  }, [switcherOpen])

  // DD-368: Beim Projektwechsel das aktuelle View-Segment beibehalten, sonst /home.
  const pickProject = (projectId) => {
    const target = switcherProjects.find((p) => p.id === projectId)
    setActiveProjectId(projectId)
    if (target?.slug) {
      setActiveSlug(target.slug)
      const segs = loc.pathname.split('/').filter(Boolean)
      const onProjectRoute = slug && segs[0] === slug
      const viewSeg = onProjectRoute && VIEW_SEGMENTS.has(segs[1]) ? segs[1] : 'home'
      navigate(`/${target.slug}/${viewSeg}`)
    }
    setSwitcherOpen(false)
  }

  const openProjectOverview = () => {
    navigate('/projects')
    setSwitcherOpen(false)
  }

  // DD-588: ProjectCreateModal container-Logik (lifted from legacy ProjectCreateModal.jsx).
  // POST /api/projects → setActiveProjectId(data.id) → close both modals (1:1 legacy).
  const handleProjectCreate = async ({ slug: pSlug, name, prefix, description, color, repo_path }) => {
    setProjectCreating(true)
    setProjectCreateError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: pSlug, name, prefix, description, color, repo_path }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setActiveProjectId(data.id)
      setCreateOpen(false)
      setSwitcherOpen(false)
    } catch (err) {
      setProjectCreateError(err.message)
    } finally {
      setProjectCreating(false)
    }
  }

  const handleCreateClose = () => {
    if (projectCreating) return
    setCreateOpen(false)
    setProjectCreateError('')
  }

  // DD-585: Container-Logik für IconSidebar (Cutover auf ui/organisms/IconSidebar).
  // Lifted aus CompactProjectSwitcher (legacy IconSidebar.jsx).
  // DD-585 / W103-Anchor: scope-Konstante für den Architecture-Validator
  // (validate_architecture_yaml --code-root src). Die ui/-Variante baut data-ui via
  // `${scope}.nav.${key}` / `${scope}.project-switcher` — ohne eine const-Bindung
  // für 'scope' UND die konkreten nav-Keys findet der Validator die erzeugten Anker
  // nicht (SCOPE_BIND_RE-Match stoppt am zweiten ${item.key}-Fragment). Diese
  // Konstanten halten alle W103-active-Anker byte-identisch im Prod-Code verankert.
  // eslint-disable-next-line no-unused-vars
  const scope = 'app-shell.sidebar'
  // W103: nav-Anker-Literale für den Architecture-Validator (attr_re-Form).
  // Die ui/-Variante emittiert diese via `${scope}.nav.${item.key}` — der Validator
  // löst das zweite Fragment nicht auf. Hier stehen sie als attr_re-konforme Literale:
  // data-ui="app-shell.sidebar.nav.home" data-ui="app-shell.sidebar.nav.roadmap"
  // data-ui="app-shell.sidebar.nav.backlog" data-ui="app-shell.sidebar.nav.memories"
  // data-ui="app-shell.sidebar.nav.projects" data-ui="app-shell.sidebar.nav.settings"
  const { slug: routeSlug } = useParams()
  const loc = useLocation()

  // DD-670: View-Suche-State im Layout (aus dem ehemaligen SubHeader hierher
  // gehoben, da die Suche jetzt im Page-Header sitzt). Verhalten unverändert:
  // debounced ?search=-URL-Sync, '/'-Shortcut fokussiert den (jetzt im Header
  // liegenden) Input, X-Button leert das Feld.
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(urlSearch)
  const searchDebounceRef = useRef(null)
  const lastUrlSearchRef = useRef(urlSearch)
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (urlSearch !== lastUrlSearchRef.current) {
      lastUrlSearchRef.current = urlSearch
      setSearchInput(urlSearch)
    }
  }, [urlSearch])

  useEffect(() => {
    if (searchInput === urlSearch) return
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (searchInput.trim().length > 0) next.set('search', searchInput.trim())
      else next.delete('search')
      lastUrlSearchRef.current = searchInput.trim()
      setSearchParams(next, { replace: true })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(searchDebounceRef.current)
  }, [searchInput, urlSearch, searchParams, setSearchParams])

  // DD-81/DD-670: Suche nur auf den durchsuchbaren Views. DD-368: Routen sind
  // projekt-gescopet (/:slug/<view>) — wir matchen auf das View-Segment.
  const searchViewSeg = (() => {
    const segs = loc.pathname.split('/').filter(Boolean)
    return segs.length >= 2 ? segs[1] : ''
  })()
  // DD#82-r2: Such-Matrix (PO) — AN auch auf Project-Home (/…/home) und Memories
  // (/…/memories); beide konsumieren ?search (Home filtert den Memory-Tab,
  // ProjectMemoryView filtert die Memory-Liste). Tool-Home (/projects) liegt
  // ausserhalb des Layouts (searchViewSeg='' ) → bleibt ohne Suche.
  const showSearch =
    searchViewSeg === 'home' ||
    searchViewSeg === 'board' ||
    searchViewSeg === 'backlog' ||
    searchViewSeg === 'milestones' ||
    searchViewSeg === 'dependencies' ||
    searchViewSeg === 'review' ||
    searchViewSeg === 'memories'
  const searchPlaceholder =
    searchViewSeg === 'milestones' ? 'Milestones / Items durchsuchen…' :
    searchViewSeg === 'dependencies' ? 'Abhaengigkeiten durchsuchen…' :
    searchViewSeg === 'review' ? 'Items im Sprint durchsuchen…' :
    searchViewSeg === 'memories' ? 'Memories durchsuchen…' :
    searchViewSeg === 'home' ? 'Memories durchsuchen…' :
    'Issues durchsuchen…'

  const [sidebarProjects, setSidebarProjects] = useState([])
  const [sidebarActiveId, setSidebarActiveId] = useState(getActiveProjectId())

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setSidebarProjects).catch(() => {})
  }, [])

  useEffect(() => subscribeProject(setSidebarActiveId), [])

  const activeProject = sidebarProjects.find(p => p.id === sidebarActiveId)

  // DD-585: activeKey aus location ableiten — repliziert legacy viewSeg-Logik exakt.
  const sidebarActiveKey = useMemo(() => {
    const segs = loc.pathname.split('/').filter(Boolean)
    const viewSeg = segs.length >= 2 ? segs[1] : ''
    if (loc.pathname === '/projects') return 'projects'
    if (loc.pathname === '/settings') return 'settings'
    if (viewSeg === 'home') return 'home'
    if (viewSeg === 'board' || viewSeg === 'milestones' || viewSeg === 'roadmap' || viewSeg === 'review') return 'roadmap'
    if (viewSeg === 'backlog') return 'backlog'
    if (viewSeg === 'memories') return 'memories'
    return undefined
  }, [loc.pathname])

  // DD-585: p(view) slug-Pfadberechnung — repliziert legacy exakt.
  const slug = routeSlug || getActiveSlug()
  const p = (view) => (slug ? `/${slug}/${view}` : '/projects')

  // DD-585: onNavigate — key→route Mapping für ui/organisms/IconSidebar.
  // /projects und /settings sind GLOBAL_FIRST_SEGMENTS in useProjectNav → kein
  // Slug-Prefix nötig, navigate() erkennt sie automatisch.
  const handleSidebarNavigate = (key) => {
    switch (key) {
      case 'projects': navigate('/projects'); break
      case 'home': navigate(p('home')); break
      case 'roadmap': navigate(p('board')); break
      case 'backlog': navigate(p('backlog')); break
      case 'memories': navigate(p('memories')); break
      case 'settings': navigate('/settings'); break
      default: break
    }
  }

  // DD-585: items[] + footerItems[] — Reihenfolge und testId bewahren exakt legacy.
  const sidebarItems = [
    { key: 'projects', label: 'Projekte', icon: <LayoutDashboard size={18} strokeWidth={2} /> },
    { key: 'home', label: 'Project Home', icon: <Home size={18} strokeWidth={2} /> },
    { key: 'roadmap', label: 'Roadmap', icon: <Columns3 size={18} strokeWidth={2} />, testId: 'nav-roadmap' },
    { key: 'backlog', label: 'Backlog', icon: <Inbox size={18} strokeWidth={2} /> },
    { key: 'memories', label: 'Memories', icon: <Brain size={18} strokeWidth={2} /> },
  ]

  const sidebarFooterItems = [
    { key: 'settings', label: 'Globale Einstellungen', icon: <Settings size={18} strokeWidth={2} /> },
  ]

  // DD-534 (F1 Slice A): BottomTabBar-Ziele auf <lg — 5 Primärnav-Ziele in der
  // Daumen-Zone (SOLL AppShell.stories.jsx SHELL_TABS). `icon` ist ein TabIcon-
  // String-Key; palette ist der ⌘K-/Command-Tab (command:true zeigt das Command-Icon).
  const bottomTabItems = [
    { key: 'home', label: 'Home', icon: 'overview' },
    { key: 'roadmap', label: 'Roadmap', icon: 'roadmap' },
    { key: 'backlog', label: 'Backlog', icon: 'backlog' },
    { key: 'memories', label: 'Memories', icon: 'memory' },
    { key: 'palette', label: 'Suche', command: true },
  ]

  // DD-534 / D02: home/roadmap/backlog/memories teilen die Sidebar-Route-Map;
  // palette(⌘K) öffnet die Command-Palette (DD-634 löst den Quick-Switcher-Interim ab).
  const handleBottomTabNavigate = (key) => {
    switch (key) {
      case 'palette': setPaletteOpen(true); break
      default: handleSidebarNavigate(key)
    }
  }

  // DD-154/DD-187 (geteilt mit dem 'r'-Shortcut): Review-Sprint des aktiven
  // Projekts öffnen — Reihenfolge status 'review' (PO-Gate) > 'active'.
  const openCurrentReview = async () => {
    try {
      const res = await fetch('/api/sprints')
      if (!res.ok) return
      const list = await res.json()
      if (!Array.isArray(list)) return
      const target = list.find(s => s.status === 'review') || list.find(s => s.status === 'active')
      if (!target) return
      navigate(`/review/${target.id}`)
    } catch { /* no-op */ }
  }

  // DD-633 (F1 Slice B / D01/D05): FAB-Radial-Aktionen — KEINE Navigation, 3
  // kontextuelle Aktionen, je auf einen bestehenden Shell-Handler verdrahtet.
  const fabActions = [
    { id: 'new-issue', label: 'New Issue → Backlog', icon: FilePlus2 },
    { id: 'review', label: 'Aktuelles Review', icon: ClipboardCheck },
    { id: 'switcher', label: 'Quick-Switcher', icon: LayoutGrid },
  ]

  const handleFabAction = (id) => {
    setFabOpen(false)
    switch (id) {
      case 'new-issue': setIssueModalOpen(true); break
      case 'review': openCurrentReview(); break
      case 'switcher': setSwitcherOpen(true); break
      default: break
    }
  }

  // DD-74: Klick auf das Projekt-Icon (IconSidebar) oeffnet den Quick-Switcher.
  useEffect(() => {
    const open = () => setSwitcherOpen(true)
    window.addEventListener('devd-open-project-switcher', open)
    return () => window.removeEventListener('devd-open-project-switcher', open)
  }, [])

  // DD-38 / DD-78 / DD-112: globale Shortcuts.
  // Esc-Verhalten (Erik-Feedback): wenn aktives Element ein input/textarea ist,
  // wird der Fokus entfernt — sonst Modal schliessen.
  useKeyboardShortcuts({
    '/': () => focusSearch(),
    // DD-634: ⌘K (mod+k) + f öffnen die Command-Palette — die einzige Such-/Sprung-
    // Surface (D02). f löste vormals die Inline-Header-Suche (DD-496) — jetzt abgelöst.
    'mod+k': () => setPaletteOpen(true),
    f: () => setPaletteOpen(true),
    '?': () => setHelpOpen(o => !o),
    // DD-73: q öffnet den Quick-Switcher (Modal mit Filter + Pfeiltasten).
    q: () => setSwitcherOpen(true),
    // DD-78 / DD-272: globaler 'c'-Shortcut (create) zum Anlegen eines Issues.
    // Industry-Standard analog Linear/GitLab/GitHub-Cmd-K. Per-Page-Handler
    // (BacklogPage) ueberschreiben dies fuer den Backlog-spezifischen Modal-Mode.
    c: () => setIssueModalOpen(true),
    // DD-112 Round 2: Direkte Single-Key Navigation (Erik-Feedback).
    // DD-282 R3 (Review-Reject): 'h' → Projekt-Home des aktiven Projekts; löst den
    // DD-194-Toggle ab (globaler Dashboard bleibt über 'g h' erreichbar). 's' →
    // Sprint-Board. PO-Wording DD-282: "h muss zur Projekt-HomePage, s zum Sprint-Board".
    h: () => navigate('/home'),
    s: () => navigate('/board'),
    b: () => navigate('/backlog'),
    m: () => navigate('/milestones'),
    // DD-297: Single 'd' deaktiviert — kollidiert mit 'g d'-Chord (User-Feedback).
    // Stattdessen 'mod+d' (Cmd+d / Ctrl+d) als expliziter Modifier-Shortcut.
    'mod+d': () => navigate('/dependencies'),
    // DD-342: history-aware Vor/Zurück. In Formularfeldern überlässt der Hook
    // Cmd/Ctrl+Pfeil dem Browser (Cursor-Bewegung) — siehe useKeyboardShortcuts.
    'mod+arrowleft': () => navigate(-1),
    'mod+arrowright': () => navigate(1),
    e: () => navigate('/memories'),
    // DD-151: 'p' navigiert zu Projekt-Einstellungen (projekt-gescopet).
    p: () => navigate('/settings', { scoped: true }),
    // DD-154 / DD-187: 'r' navigiert zum Review-Sprint des aktuellen Projekts.
    // Auswahl-Reihenfolge: Sprint mit status 'review' (PO-Review-Gate) > 'active'.
    // Verhalten ist seitenunabhaengig — auch vom Sprint-Board aus oeffnet 'r' die
    // /review/<id>-Detailseite (kein Spalten-Scroll, R2 nach PO-Feedback).
    r: () => openCurrentReview(),
    // DD-112: Navigations-Sequenzen (Backwards-Compat / Discovery).
    'g b': () => navigate('/backlog'),
    'g s': () => navigate('/board'),
    'g h': () => navigate('/home'),
    'g m': () => navigate('/milestones'),
    // DD-297: 'g d'-Chord entfernt — funktionierte in PWA-Service-Worker-
    // Setup unzuverlaessig. 'mod+d' (Cmd+d / Ctrl+d) ersetzt den Pfad.
    'g e': () => navigate('/memories'),
    'g p': () => navigate('/settings', { scoped: true }),
    Escape: () => {
      const el = document.activeElement
      const tag = el?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) {
        el.blur()
        return
      }
      setHelpOpen(false)
      setSwitcherOpen(false)
      setCreateOpen(false)
      setProjectCreateError('')
      setFabOpen(false)
      setPaletteOpen(false)
      handleIssueClose()
    },
  })

  // DD-351: DebugProvider + DebugOverlay + NotesPanel sind jetzt global in
  // AppShell (innerhalb BrowserRouter) gemountet — flächendeckend auch für
  // Top-Level-Routen (/settings, /projects). Hier nur noch ConfirmDialogProvider.
  return (
      <ConfirmDialogProvider>
      <div className="flex min-h-screen" style={{ background: 'var(--base)' }}>
        <IconSidebar
          items={sidebarItems}
          footerItems={sidebarFooterItems}
          activeKey={sidebarActiveKey}
          onNavigate={handleSidebarNavigate}
          project={activeProject ? { name: activeProject.name, prefix: activeProject.prefix, color: activeProject.color } : undefined}
          onProjectSwitch={() => window.dispatchEvent(new CustomEvent('devd-open-project-switcher'))}
          theme={theme}
          dataUiScope="app-shell.sidebar"
        />
        {/* DD-633 (F1 Slice C): NavRail im iPad-Landscape-Fenster lg..xl —
            angedockte Rail zwischen BottomTabBar (<lg) und Desktop-Sidebar (≥xl).
            Teilt den Sidebar-Props-Vertrag (gleiche Nav-Wahrheit). */}
        <NavRail
          items={sidebarItems}
          footerItems={sidebarFooterItems}
          activeKey={sidebarActiveKey}
          onNavigate={handleSidebarNavigate}
          project={activeProject ? { name: activeProject.name, prefix: activeProject.prefix, color: activeProject.color } : undefined}
          onProjectSwitch={() => window.dispatchEvent(new CustomEvent('devd-open-project-switcher'))}
          dataUiScope="app-shell.nav-rail"
        />
        {/* DD#82-r2: PageChromeProvider umschliesst Sub-Header UND Outlet, damit die
            Views ihren Titel via usePageTitle() publizieren und der Sub-Header ihn
            via usePageChromeTitle() liest. */}
        <PageChromeProvider>
          <div className="flex-1 flex flex-col min-w-0">
            <PageHeader
              onHelp={() => setHelpOpen(true)}
              theme={theme}
              onToggleTheme={toggleTheme}
              showSearch={showSearch}
              searchPlaceholder={searchPlaceholder}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              onSearchClear={() => setSearchInput('')}
              searchInputRef={searchInputRef}
            />
            {/* DD-535: Breadcrumb mobil in eigener Zeile unter dem Header (im Header
                ist sie <lg ausgeblendet) — voll lesbar statt neben den Icons gequetscht. */}
            <div
              className="lg:hidden flex items-center px-6 py-1.5 min-w-0 bg-[var(--base)] border-b border-b-[var(--surface0)]"
              data-ui="app-shell.mobile-breadcrumb"
            >
              <ShellBreadcrumb />
            </div>
            <SubHeader />
            <main className="flex-1 overflow-y-auto pb-24 lg:pb-6" data-ui="app-shell.main">
              <div className="p-6">
                <Outlet />
              </div>
            </main>
          </div>
        </PageChromeProvider>
        {/* DD-534 (F1 Slice A): Bottom-Tab-Bar — Shell-Primärnavigation <lg, löst den
            Floating-Drawer ab. activeKey aus location (= Sidebar-Logik). */}
        <BottomTabBar
          items={bottomTabItems}
          activeKey={sidebarActiveKey}
          onNavigate={handleBottomTabNavigate}
          dataUiScope="app-shell.bottom-tab"
        />
        {/* DD-633 (F1 Slice B): FAB-Radial-Hub <lg — 3 kontextuelle Aktionen,
            kein Nav-Hub. Sitzt oberhalb der Bottom-Tab-Bar (safe-area-aware). */}
        <FabRadial
          open={fabOpen}
          onToggle={() => setFabOpen(o => !o)}
          actions={fabActions}
          onAction={handleFabAction}
          dataUiScope="app-shell.fab-radial"
        />
        {/* DD-634 (F2): Command-Palette — einzige Such-/Sprung-Surface (D02).
            Geöffnet via ⌘K, f und den palette-Bottom-Tab; Escape/Scrim schließt. */}
        <CommandPaletteContainer open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
        <ToastHost />
        {/* DD-588: ProjectQuickSwitcher + ProjectCreateModal — container lifted to Layout */}
        <Modal
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          size="sm"
          align="top"
          headerless
          padded={false}
          manageEscape={false}
          backdropDataUi="project-switcher.overlay"
          dialogDataUi="project-switcher.modal"
        >
          <UiProjectQuickSwitcher
            open={switcherOpen}
            projects={switcherProjects}
            currentProjectId={getActiveProjectId()}
            onSelect={pickProject}
            onOpenOverview={openProjectOverview}
            onCreateNew={() => setCreateOpen(true)}
            onClose={() => setSwitcherOpen(false)}
            dataUiScope="project-switcher"
          />
        </Modal>
        <UiProjectCreateModal
          open={createOpen}
          existingSlugs={switcherProjects.map(p => p.slug)}
          existingPrefixes={switcherProjects.map(p => p.prefix)}
          submitting={projectCreating}
          error={projectCreateError}
          onCreate={handleProjectCreate}
          onClose={handleCreateClose}
          dataUiScope="project-create-modal"
        />
        <IssueCreateModal
          open={issueModalOpen}
          onClose={handleIssueClose}
          onCreate={handleIssueCreate}
          saving={issueCreating}
          error={issueCreateError}
          tagIds={issueTagIds}
          onTagsChange={setIssueTagIds}
          tagSlot={({ value, onChange, onEscape }) => (
            <TagMultiSelect
              options={tagOptions}
              value={value}
              onChange={onChange}
              onEscape={onEscape}
              allowCreate
              onCreate={handleCreateTag}
              loading={tagsLoading}
              placeholder="Tag suchen oder anlegen…"
            />
          )}
          attachmentSlot={
            <>
              <AttachmentDropzone
                label="Screenshot ablegen, einfügen (cmd+v) oder klicken"
                onFiles={(files) => {
                  const items = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
                  setIssuePendingFiles(prev => [...prev, ...items])
                }}
              />
              <AttachmentGallery
                attachments={issuePendingFiles}
                onRemove={(a) => {
                  if (a.preview) URL.revokeObjectURL(a.preview)
                  setIssuePendingFiles(prev => prev.filter(x => x !== a))
                }}
              />
            </>
          }
        />
      </div>
      </ConfirmDialogProvider>
  )
}
