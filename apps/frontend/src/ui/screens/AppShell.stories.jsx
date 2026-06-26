/**
 * AppShell — die montierte App-Hülle (NavigationRail + Topbar + Outlet + ToastHost)
 * mit ECHTEN Screens im Content-Slot. Zweck: Screens MIT Shell-Chrome bewerten
 * (Rail-Highlight, Breadcrumb, Spacing/Tokens). Der Frame selbst lebt in
 * `src/screens/_shell/AppShellFrame.jsx` (handgebaute Hülle, kein src/ui-Bauteil)
 * und hat dort keine eigene Story — hier wird er für den Review-Augenschein komponiert.
 *
 * Presentational: Screens via Fixtures/Props, Navigation als no-op. MemoryRouter
 * macht die Router-Hooks (useLocation/useProjectNav) im Storybook + SSR-Smoke
 * funktionsfähig; der Pfad je Story steuert Rail-Highlight + Breadcrumb.
 * 0 inline-style / 0 Raw-Hex.
 */
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { fn } from 'storybook/test'
import AppShellFrame from './AppShell.jsx'
import RoadmapBoardScreen from './RoadmapBoardScreen.jsx'
import IssueDetails from './IssueDetails.jsx'
import milestones from '../foundations/fixtures/milestone-list.json'
import deps from '../foundations/fixtures/milestone-deps.json'
import unassignedSprints from '../foundations/fixtures/roadmap-unassigned.json'
import { roadmapHandlers } from '../foundations/fixtures/roadmap.handlers.js'

// Shell an `path` rendern, `content` im Outlet. Pathless Layout-Route → AppShellFrame,
// Catch-all-Kind → Screen. Der Pfad bestimmt, welches Rail-Item aktiv ist.
function shellAt(path, content) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShellFrame />}>
          <Route path="*" element={content} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

const roadmapProps = {
  slug: 'devd2',
  milestones,
  deps,
  unassignedSprints,
  metaPanelOpen: false,
  showUnassigned: true,
  initialSelectedKind: 'none',
  onOpenSprint: fn(),
  onOpenMilestone: fn(),
  onReorder: fn(),
  onCardMove: fn(),
  onTransition: fn(),
  onCreateMilestone: fn(),
  onCreateSprint: fn(),
  onCreateIssue: fn(),
}

const meta = {
  title: '05 SCREENS/AppShell',
  component: AppShellFrame,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

// Roadmap-Board im Shell — Rail hebt „Roadmap", Breadcrumb [devd2 › Roadmap].
export const RoadmapImShell = {
  parameters: { msw: { handlers: roadmapHandlers } },
  render: () => shellAt('/devd2/roadmap', <RoadmapBoardScreen {...roadmapProps} />),
}

// Issue-Detail im Shell — issues hat kein Rail-Item → Rail-Default, Breadcrumb [devd2].
export const IssueDetailImShell = {
  render: () => shellAt('/devd2/issues/DD2-7', <IssueDetails dataUiScope="screen.issueDetails.fixture" />),
}

// Nur Chrome (Rail + Topbar), leerer Content — Spacing/Token-Augenschein der Hülle.
export const LeereHuelle = {
  render: () =>
    shellAt(
      '/devd2/home',
      <div data-ui="appshell-story.empty" className="[font-family:var(--font-display)] text-[13px] text-[var(--subtext0)]">
        Kein Screen montiert — reiner Chrome-Augenschein (Rail · Topbar · Content-Padding).
      </div>,
    ),
}
