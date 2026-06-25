# GF-2 App-Shell-Fundament (P0.2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neuer App-Shell (Boot, Provider-Stack, Shell-Frame, Routen-Skelett nach Routen-Vertrag) als Fundament, das die existierenden Screens via Strangler-Bridge weiter bedient, bis sie per Worktree einzeln ersetzt werden.

**Architecture:** Neuer Shell unter `src/screens/_shell/` komponiert die stabilen 05.80-AppShell-Organismen + den bestehenden Provider-Stack. `src/main.jsx` bootet `AppRoot` statt `src/views/AppShell.jsx`. Das Routen-Skelett folgt dem Vertrag (Master-Doc §3); jede Route zeigt **anfangs auf die existierende Screen-Komponente** (D17-A Strangler-Bridge) — Per-Screen-Worktrees biegen sie später auf `src/screens/<Screen>/` um. Legacy-Redirects + gedroppte Routen werden NICHT übernommen.

**Tech Stack:** React 19, react-router (BrowserRouter), Vite 8. Tests: vitest node-env + `renderToStaticMarkup` + MemoryRouter (Repo-Konvention, kein jsdom). Stabile Stories via `composeStories`.

**Design-Annahme (Review-Gate):** D17-A Strangler-Bridge (Shell live + alte Screens weiter bedient, per-Screen-Swap). Falls verworfen → Plan-Struktur ändert sich (Routen auf Stubs statt alte Screens).

**Abhängigkeit:** P0.1-Toast-Molecule (ToastHost). Interim mountet das Fundament den **bestehenden** ToastHost (`devd-toast`-Listener); sobald das Molecule steht, wird der Import getauscht (1-Zeilen-Swap, Task 7).

**Out-of-scope:** Screen-Inhalte (P1–P3), Net-New-Komponenten (P0.1 via /dd-build-story), C4-Aktivierung einzelner Screens (D13, per-Screen).

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/screens/_shell/AppRoot.jsx` (neu) | Boot: `resolveView()` → app-shell / capture / unknown-banner; rendert Router + Providers |
| `src/screens/_shell/Providers.jsx` (neu) | Provider-Stack in fester Reihenfolge (Debug > PageChrome > ConfirmDialog) |
| `src/screens/_shell/navItems.js` (neu) | Rail-Items + Topbar-Breadcrumb-Konfig nach Routen-Vertrag |
| `src/screens/_shell/AppShellFrame.jsx` (neu) | Komponiert AppShellRail + AppShellTopbar + AppShell + `<Outlet/>`; mountet AuthExpiredOverlay + ToastHost |
| `src/screens/_shell/routes.jsx` (neu) | Routen-Tabelle (global + projekt-scoped) nach Vertrag; Ziel = vorerst existierende Screens |
| `src/main.jsx` (modify) | bootet `AppRoot` statt alter `AppShell` |
| `tests/gf2-appshell/*.test.jsx` (neu) | TDD-Tests pro Task |

Reihenfolge der Tasks ist bindend (jede baut auf der vorigen). Commit nach jedem Task.

---

## Task 1: navItems-Konfiguration (Routen-Vertrag als Daten)

**Files:**
- Create: `src/screens/_shell/navItems.js`
- Test: `tests/gf2-appshell/navItems.test.js`

- [ ] **Step 1: Failing test**

```js
// tests/gf2-appshell/navItems.test.js
import { describe, it, expect } from 'vitest'
import { PROJECT_ROUTES, GLOBAL_ROUTES, DROPPED_PATHS } from '../../src/screens/_shell/navItems.js'

describe('navItems route contract', () => {
  it('hat genau die 13 projekt-scoped Vertrags-Routen', () => {
    const paths = PROJECT_ROUTES.map((r) => r.path)
    expect(paths).toEqual([
      'home', 'roadmap', 'milestones', 'milestones/:id',
      'sprints', 'sprints/:id', 'issues', 'issues/:id',
      'backlog', 'review/:sprintId', 'memories', 'settings',
    ])
  })
  it('droppt board + legacy + dependencies', () => {
    expect(DROPPED_PATHS).toContain('board')
    expect(DROPPED_PATHS).toContain('dependencies')
    expect(DROPPED_PATHS).toContain('memories/global')
  })
  it('globale Routen = projects + settings + sops', () => {
    expect(GLOBAL_ROUTES.map((r) => r.path)).toEqual([
      'projects', 'settings', 'settings/sops', 'settings/sops/:key',
    ])
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/navItems.test.js`
Expected: FAIL — `Cannot find module navItems.js`.

- [ ] **Step 3: Implement**

```js
// src/screens/_shell/navItems.js
// Routen-Vertrag als Daten (Master-Doc §3). Ziel-Komponenten werden in routes.jsx verdrahtet.
export const GLOBAL_ROUTES = [
  { path: 'projects', screen: 'ProjectsLanding' },
  { path: 'settings', screen: 'GlobalSettings' },
  { path: 'settings/sops', screen: 'SopList' },
  { path: 'settings/sops/:key', screen: 'SopView' },
]

export const PROJECT_ROUTES = [
  { path: 'home', screen: 'ProjectHome', railKey: 'home', label: 'Home' },
  { path: 'roadmap', screen: 'RoadmapBoard', railKey: 'roadmap', label: 'Roadmap' },
  { path: 'milestones', screen: 'MilestonesList', railKey: 'milestones', label: 'Milestones' },
  { path: 'milestones/:id', screen: 'MilestoneDetail' },
  { path: 'sprints', screen: 'SprintsList', railKey: 'sprints', label: 'Sprints' },
  { path: 'sprints/:id', screen: 'SprintDetail' },
  { path: 'issues', screen: 'IssuesList', railKey: 'issues', label: 'Issues' },
  { path: 'issues/:id', screen: 'IssueDetail' },
  { path: 'backlog', screen: 'BacklogPage', railKey: 'backlog', label: 'Backlog' },
  { path: 'review/:sprintId', screen: 'SprintReview' },
  { path: 'memories', screen: 'ProjectMemoryView', railKey: 'memories', label: 'Memories' },
  { path: 'settings', screen: 'ProjectSettings', railKey: 'settings', label: 'Settings' },
]

// Bewusst NICHT übernommen (Master-Doc §3 „Gedroppt").
export const DROPPED_PATHS = [
  'board', 'dependencies', 'memories/global', 'settings/api-keys',
  'issues/:id-legacy', 'item/:id', 'sprint/:id', 'milestone/:id',
  'project/:id', 'dashboard/home', 'roadmap-v2',
]

// Rail-Items = projekt-scoped Routen mit railKey, in Reihenfolge.
export const RAIL_ITEMS = PROJECT_ROUTES.filter((r) => r.railKey)
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/navItems.test.js`
Expected: PASS (3 Tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/erik/Obsidian/tools/DD-wt-appshell
git add src/screens/_shell/navItems.js tests/gf2-appshell/navItems.test.js
git commit -m "feat(gf2-shell): route-contract as data (navItems)"
```

---

## Task 2: Provider-Stack

**Files:**
- Create: `src/screens/_shell/Providers.jsx`
- Test: `tests/gf2-appshell/providers.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// tests/gf2-appshell/providers.test.jsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Providers } from '../../src/screens/_shell/Providers.jsx'

describe('Providers', () => {
  it('rendert children innerhalb des Provider-Stacks', () => {
    const html = renderToStaticMarkup(<Providers><div data-ui="probe">x</div></Providers>)
    expect(html).toContain('data-ui="probe"')
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/providers.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```jsx
// src/screens/_shell/Providers.jsx
// Fester Provider-Stack. Reihenfolge: Debug (äußerst) > PageChrome > ConfirmDialog.
// useTheme ist ein Hook (kein Provider) und wird im Frame aufgerufen.
import { DebugProvider } from '../../contexts/DebugContext.jsx'
import { PageChromeProvider } from '../../lib/pageChrome.jsx'
import { ConfirmDialogProvider } from '../../contexts/ConfirmDialogContext.jsx'

export function Providers({ children }) {
  return (
    <DebugProvider>
      <PageChromeProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </PageChromeProvider>
    </DebugProvider>
  )
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/providers.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/erik/Obsidian/tools/DD-wt-appshell
git add src/screens/_shell/Providers.jsx tests/gf2-appshell/providers.test.jsx
git commit -m "feat(gf2-shell): provider stack"
```

---

## Task 3: AppShellFrame (Shell-Rahmen aus stabilen Organismen)

**Files:**
- Create: `src/screens/_shell/AppShellFrame.jsx`
- Test: `tests/gf2-appshell/frame.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// tests/gf2-appshell/frame.test.jsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AppShellFrame } from '../../src/screens/_shell/AppShellFrame.jsx'

describe('AppShellFrame', () => {
  it('emittiert die stabilen App-Shell-Anker', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/devd/home']}>
        <AppShellFrame />
      </MemoryRouter>,
    )
    expect(html).toContain('data-ui="app-shell.root"')
    expect(html).toContain('data-ui="app-shell.rail"')
    expect(html).toContain('data-ui="app-shell.topbar"')
    expect(html).toContain('data-ui="app-shell.content"')
  })
  it('mountet Auth-Overlay-Anker', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/devd/home']}><AppShellFrame /></MemoryRouter>,
    )
    expect(html).toContain('data-ui="auth.expired-overlay"')
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/frame.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```jsx
// src/screens/_shell/AppShellFrame.jsx
// Komponiert die stabilen 05.80-Organismen (AppShell/AppShellRail/AppShellTopbar)
// + Outlet für die Screen-Inhalte. Mountet AuthExpiredOverlay + ToastHost.
import { Outlet } from 'react-router'
import AppShell from '../../components/ui/organisms/AppShell.jsx'
import AppShellRail from '../../components/ui/organisms/AppShellRail.jsx'
import AppShellTopbar from '../../components/ui/organisms/AppShellTopbar.jsx'
import AuthExpiredOverlay from '../../components/ui/molecules/AuthExpiredOverlay.jsx'
import { ToastHost } from './ToastHost.jsx'
import { RAIL_ITEMS } from './navItems.js'

const railItems = RAIL_ITEMS.map((r) => ({ key: r.railKey, label: r.label, Cmp: () => null }))

export function AppShellFrame() {
  return (
    <>
      <AppShell
        rail={<AppShellRail items={railItems} />}
        topbar={<AppShellTopbar breadcrumb={['DevDash']} />}
      >
        <Outlet />
      </AppShell>
      <AuthExpiredOverlay />
      <ToastHost />
    </>
  )
}
```

> Hinweis: `AppShellRail`-Items erwarten `{key, Cmp, label}`. Das Icon (`Cmp`) wird in einem Folge-Task aus der Icon-Registry verdrahtet; hier Platzhalter `() => null`, damit der Rahmen rendert. Der Anker-Test prüft den Rahmen, nicht das Icon.

- [ ] **Step 4: Create ToastHost (interim, reuse vorhandenes Verhalten)**

```jsx
// src/screens/_shell/ToastHost.jsx
// Interim: lauscht auf das bestehende 'devd-toast'-CustomEvent (src/lib/toast.js).
// Wird in Task 7 durch das stabile Toast-Molecule (P0.1) ersetzt.
import { useEffect, useState } from 'react'

export function ToastHost() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    function onToast(e) {
      const t = { id: Math.random(), ...e.detail }
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 5000)
    }
    window.addEventListener('devd-toast', onToast)
    return () => window.removeEventListener('devd-toast', onToast)
  }, [])
  return (
    <div data-ui="toast.host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} data-ui={`toast.${t.kind || 'info'}`}>{t.message}</div>
      ))}
    </div>
  )
}
```

> `Math.random()` ist hier Laufzeit-Key (kein Determinismus-Bedarf); die node-Tests rendern statisch ohne Event, also keine Kollision mit der Workflow-Sandbox-Regel.

- [ ] **Step 5: Run, verify PASS**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/frame.test.jsx`
Expected: PASS (2 Tests). Falls ein Organism-Import default vs named abweicht: Import an die echte Export-Form anpassen (siehe Interface-Tabelle: AppShell.jsx:30 etc.) und erneut laufen.

- [ ] **Step 6: Commit**

```bash
cd /Users/erik/Obsidian/tools/DD-wt-appshell
git add src/screens/_shell/AppShellFrame.jsx src/screens/_shell/ToastHost.jsx tests/gf2-appshell/frame.test.jsx
git commit -m "feat(gf2-shell): app-shell frame from stable organisms + interim toast host"
```

---

## Task 4: Routen-Skelett (Vertrag → Routen, alte Screens als Ziel)

**Files:**
- Create: `src/screens/_shell/routes.jsx`
- Test: `tests/gf2-appshell/routes.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// tests/gf2-appshell/routes.test.jsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes } from 'react-router'
import { buildRoutes } from '../../src/screens/_shell/routes.jsx'

function renderAt(path) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}><Routes>{buildRoutes()}</Routes></MemoryRouter>,
  )
}

describe('routes skeleton', () => {
  it('rendert backlog-Screen unter /:slug/backlog', () => {
    expect(renderAt('/devd/backlog')).toContain('data-ui')
  })
  it('leitet / auf /projects (kein Crash)', () => {
    expect(() => renderAt('/')).not.toThrow()
  })
  it('gedroppte Route /devd/board rendert NICHT board, sondern Fallback', () => {
    const html = renderAt('/devd/board')
    expect(html).not.toContain('data-ui="screen:roadmap-board.root"')
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/routes.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement (Strangler-Bridge: Ziel = vorerst existierende Screens)**

```jsx
// src/screens/_shell/routes.jsx
// Routen-Skelett nach Vertrag. D17-A: jede Route zeigt ANFANGS auf die existierende
// Screen-Komponente (src/views / src/components). Per-Screen-Worktrees biegen den
// Import später auf src/screens/<Screen>/ um. Legacy-Redirects sind NICHT enthalten.
import { lazy, Suspense } from 'react'
import { Route, Navigate } from 'react-router'
import { AppShellFrame } from './AppShellFrame.jsx'

// Bestehende Screens (Strangler-Ziel). Pfade aus Interface-Audit / src/views.
const ProjectsLanding = lazy(() => import('../../views/ProjectsLanding.jsx'))
const GlobalSettings = lazy(() => import('../../views/GlobalSettings.jsx'))
const ProjectHomeView = lazy(() => import('../../views/ProjectHomeView.jsx'))
const RoadmapBoard = lazy(() => import('../../views/RoadmapBoard.jsx'))
const BacklogPage = lazy(() => import('../../views/BacklogPage.jsx'))
const ItemDetail = lazy(() => import('../../views/ItemDetail.jsx'))
const SprintDetail = lazy(() => import('../../views/SprintDetail.jsx'))
const SprintReviewV2 = lazy(() => import('../../views/SprintReviewV2.jsx'))
const MilestoneDetail = lazy(() => import('../../views/MilestoneDetail.jsx'))
const ProjectMemoryView = lazy(() => import('../../views/ProjectMemoryView.jsx'))
const ProjectSettings = lazy(() => import('../../views/ProjectSettings.jsx'))

function Stub({ name }) { return <div data-ui={`screen:${name}.placeholder`}>{name}</div> }

export function buildRoutes() {
  return (
    <>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<ProjectsLanding />} />
      <Route path="/settings" element={<GlobalSettings />} />
      {/* SOP-Routen sind neu → vorerst Stub bis P1 */}
      <Route path="/settings/sops" element={<Stub name="sop-list" />} />
      <Route path="/settings/sops/:key" element={<Stub name="sop-view" />} />

      <Route path="/:slug" element={<AppShellFrame />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<ProjectHomeView />} />
        <Route path="roadmap" element={<RoadmapBoard />} />
        {/* Listen-Screens neu → Stub bis P2 */}
        <Route path="milestones" element={<Stub name="milestones-list" />} />
        <Route path="milestones/:id" element={<MilestoneDetail />} />
        <Route path="sprints" element={<Stub name="sprints-list" />} />
        <Route path="sprints/:id" element={<SprintDetail />} />
        <Route path="issues" element={<Stub name="issues-list" />} />
        <Route path="issues/:id" element={<ItemDetail commandCenter />} />
        <Route path="backlog" element={<BacklogPage />} />
        <Route path="review/:sprintId" element={<SprintReviewV2 />} />
        <Route path="memories" element={<ProjectMemoryView />} />
        <Route path="settings" element={<ProjectSettings />} />
        {/* gedroppt: board / dependencies → auf home umleiten, kein 404-Loch */}
        <Route path="board" element={<Navigate to="home" replace />} />
        <Route path="dependencies" element={<Navigate to="home" replace />} />
      </Route>
      {/* kein Catch-all-Legacy-Redirect (Vertrag: alle 12 gedroppt) */}
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </>
  )
}

export { Suspense }
```

> Falls ein Screen-Import-Pfad abweicht (z.B. `ItemDetail` liegt unter `views/` vs `components/`): mit `git -C <repo> ls-files | grep <Name>` den realen Pfad finden und Import anpassen. Stubs bleiben für die 3 neuen Listen + 2 SOP-Routen, bis P1/P2 sie ersetzt.

- [ ] **Step 4: Run, verify PASS**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/routes.test.jsx`
Expected: PASS (3 Tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/erik/Obsidian/tools/DD-wt-appshell
git add src/screens/_shell/routes.jsx tests/gf2-appshell/routes.test.jsx
git commit -m "feat(gf2-shell): route skeleton per contract (strangler bridge to existing screens)"
```

---

## Task 5: AppRoot (Boot + Hostname-Resolve)

**Files:**
- Create: `src/screens/_shell/AppRoot.jsx`
- Test: `tests/gf2-appshell/approot.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// tests/gf2-appshell/approot.test.jsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppShellView } from '../../src/screens/_shell/AppRoot.jsx'

describe('AppRoot view dispatch', () => {
  it('app-shell-View rendert den Shell (root-Anker)', () => {
    const html = renderToStaticMarkup(<AppShellView initialPath="/devd/backlog" />)
    expect(html).toContain('data-ui="app-shell.root"')
  })
  it('unknown-View zeigt Banner', () => {
    const html = renderToStaticMarkup(<AppShellView initialPath="/devd/backlog" forceBanner />)
    expect(html).toContain('data-ui="boot.unknown-host-banner"')
  })
})
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/approot.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```jsx
// src/screens/_shell/AppRoot.jsx
// Boot-Einstieg: resolveView() entscheidet app-shell vs capture vs unknown-banner.
// installApiClient() wird in main.jsx VOR dem Render aufgerufen (Side-Effect, kein Render).
import { Suspense } from 'react'
import { BrowserRouter, MemoryRouter, Routes } from 'react-router'
import { Providers } from './Providers.jsx'
import { buildRoutes } from './routes.jsx'
import { resolveView, VIEW_APP_SHELL, UNKNOWN_HOST_FALLBACK } from '../../lib/hostnameRouter.js'

function RouteFallback() { return <div data-ui="boot.loading">…</div> }

// Testbarer Shell-View (MemoryRouter, kein window). forceBanner simuliert unknown host.
export function AppShellView({ initialPath = '/', forceBanner = false }) {
  return (
    <Providers>
      {forceBanner && <div data-ui="boot.unknown-host-banner">Unbekannter Host</div>}
      <MemoryRouter initialEntries={[initialPath]}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>{buildRoutes()}</Routes>
        </Suspense>
      </MemoryRouter>
    </Providers>
  )
}

// Produktiver Einstieg (window-gebunden).
export function AppRoot() {
  const { view } = resolveView(window.location.hostname, window.location.search, window.location.pathname)
  const showBanner = view !== VIEW_APP_SHELL && UNKNOWN_HOST_FALLBACK === VIEW_APP_SHELL
  // Capture-View bleibt vorerst beim bestehenden Boot (separater Pfad) — hier nur App-Shell.
  return (
    <Providers>
      {showBanner && <div data-ui="boot.unknown-host-banner">Unbekannter Host</div>}
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>{buildRoutes()}</Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  )
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell/approot.test.jsx`
Expected: PASS (2 Tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/erik/Obsidian/tools/DD-wt-appshell
git add src/screens/_shell/AppRoot.jsx tests/gf2-appshell/approot.test.jsx
git commit -m "feat(gf2-shell): AppRoot boot + hostname view dispatch"
```

---

## Task 6: main.jsx auf AppRoot umstellen (Shell geht live)

**Files:**
- Modify: `src/main.jsx`
- Test: manuell (Vite-Boot) — kein Unit-Test (Entry-Point-Side-Effects)

- [ ] **Step 1: main.jsx lesen + Import tauschen**

Lies `src/main.jsx`. Ersetze den Import + Render der alten `AppShell` (aus `./views/AppShell.jsx`) durch `AppRoot`. `installApiClient()` bleibt VOR dem Render (unverändert).

```jsx
// src/main.jsx — relevanter Ausschnitt
import { AppRoot } from './screens/_shell/AppRoot.jsx'
// ... installApiClient() bleibt wie gehabt vor createRoot(...)
createRoot(document.getElementById('root')).render(<AppRoot />)
```

- [ ] **Step 2: Build + Lint grün**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npm run build && npx vitest run tests/gf2-appshell`
Expected: Build ok, alle gf2-appshell-Tests PASS.

- [ ] **Step 3: Manueller Smoke (lokal)**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npm run dev:nas`
Erwartung: `localhost:5173` (oder Vite-Port) zeigt den neuen Shell; `/projects`, `/<slug>/backlog`, `/<slug>/home` laden die bestehenden Screens im neuen Rahmen; `/<slug>/board` leitet auf home; neue Listen/SOP zeigen Stub. Auth-Overlay + Toast-Host gemountet.

- [ ] **Step 4: Commit**

```bash
cd /Users/erik/Obsidian/tools/DD-wt-appshell
git add src/main.jsx
git commit -m "feat(gf2-shell): boot AppRoot (new shell live, strangler bridge)"
```

---

## Task 7: Toast-Molecule-Swap (nach P0.1)

**Files:**
- Modify: `src/screens/_shell/ToastHost.jsx`
- Test: `tests/gf2-appshell/frame.test.jsx` (bleibt grün)

> **Vorbedingung:** P0.1-Toast-Molecule (via /dd-build-story) ist `status:stable`.

- [ ] **Step 1: Interim-ToastHost durch das stabile Molecule ersetzen**

Tausche den Inhalt von `ToastHost.jsx` so, dass er das stabile Toast-Molecule rendert (Listener bleibt `devd-toast`, Darstellung kommt aus dem Molecule). Anker `toast.host` + `toast.<kind>` müssen erhalten bleiben (Frame-Test prüft sie nicht hart, aber C4 erwartet sie).

- [ ] **Step 2: Tests grün**

Run: `cd /Users/erik/Obsidian/tools/DD-wt-appshell && npx vitest run tests/gf2-appshell`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/erik/Obsidian/tools/DD-wt-appshell
git add src/screens/_shell/ToastHost.jsx
git commit -m "feat(gf2-shell): swap interim toast host for stable Toast molecule"
```

---

## C4-Aktivierung (nach Task 6, vor PR)

Das Fundament trägt die App-Shell-Anker (`app-shell.root/rail/topbar/content`) — diese sind in C4 (`architecture.components.appshell.yaml`) bereits `active` und zeigten auf den alten Shell. **C4 scharf schalten (D13):** Realization der appshell-Komponente von `src/views/AppShell.jsx` auf `src/screens/_shell/` umbiegen; Code→C4-Gate (`validate_architecture_yaml.py`) lokal grün prüfen. (specs-DD-Änderung läuft über main/`ddc`, nicht in diesem Feature-Branch — siehe Master-Doc.)

Run (Gate-Check): `cd <repo> && python3 specs-DD/01-PRD-SAD-FSD/architecture/validate_architecture_yaml.py`
Expected: `errors: 0`.

---

## Definition of Done (P0.2)

- [ ] Tasks 1–6 grün (Task 7 nach P0.1).
- [ ] `npm run build` + `npx vitest run tests/gf2-appshell` grün.
- [ ] Manueller Smoke: neuer Shell live, alle Vertrags-Routen erreichbar (bestehende Screens im neuen Rahmen, Stubs für die 5 neuen), gedroppte Routen leiten auf home/projects.
- [ ] C4 appshell-Realization auf neuen Shell umgebogen, `validate_architecture_yaml.py` → `errors: 0`.
- [ ] PR `feat/gf2-appshell-foundation` → main (kein Push ohne Version-Tag, Harte Regel 7 — lokal mergen/flaggen).
