/**
 * GF-2 — BacklogScreen (08.10 Backlog). Holistische Screen-Story für das PO-
 * Surface-Elevation-Review: der ECHTE BacklogScreen (MasterDetailScreen-Template +
 * IssueRow-Liste + BacklogDetails-Pane) mit Fixtures statt Backend, props-driven.
 *
 * Zwei Farb-Args zum holistischen Tunen des Surface-Stacks (Default = Produktiv-
 * Verhalten):
 *   - colorBackgroundSidebar   → Listen-Panel-Canvas (MasterDetail.sidebarSurface)
 *   - colorBackgroundBacklogrow → IssueRow Ruhe-Fill (restTone; Selection unberührt)
 *
 * Gate-Hinweis: IssueRow trägt pro Zeile denselben Root-Anker `backlog.list.row`
 * (kein Per-Item-Suffix). Die Multi-Row-Stories heißen daher NICHT Default/Main
 * (data-ui-unique-gate prüft nur diese beiden); die State_- und Variant_-Stories
 * sind exempt.
 */
import { fn } from 'storybook/test'
import BacklogScreen from '../../../screens/BacklogPage/BacklogScreen.jsx'
import AppShell from '../../../components/ui/organisms/AppShell.jsx'
import MasterDetailScreen from '../../../components/ui/templates/MasterDetailScreen.jsx'
import IssueRow from '../../../components/ui/organisms/IssueRow.jsx'
import IssueDetails from '../../../components/ui/organisms/IssueDetails.jsx'
import Button from '../../../components/ui/atoms/Button.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const TAGS = [
  { id: 1, name: 'frontend', color: 'blue' },
  { id: 2, name: 'tokens', color: 'green' },
  { id: 3, name: 'urgent', color: 'red' },
]

const ITEMS = [
  { id: 1, project_prefix: 'DD', project_number: 701, title: 'Surface-Elevation-Kanon im Backlog einhalten', type: 'bug', status: 'refined', priority: 1, tags: [TAGS[2]], assigned_sprint: 'DD#20', sprint_name: 'Frontend-Rework Phase 3' },
  { id: 2, project_prefix: 'DD', project_number: 702, title: 'IssueRow Ruhe-Fill evaluieren', type: 'refactor', status: 'refined', priority: 2, tags: [TAGS[0], TAGS[1]] },
  { id: 3, project_prefix: 'DD', project_number: 703, title: 'BacklogScreen-Story unter 08 bauen', type: 'feature', status: 'new', priority: 3, tags: [TAGS[0]] },
  { id: 4, project_prefix: 'DD', project_number: 704, title: 'ContentCards auf layer-3', type: 'chore', status: 'new', priority: 4, tags: [] },
  { id: 5, project_prefix: 'DD', project_number: 705, title: 'Volltextsuche im Backlog schärfen', type: 'feature', status: 'refined', priority: 2, tags: [TAGS[1]] },
]

const ACTIVE = {
  ...ITEMS[0],
  milestone: 'M3 — Project Home Tab',
  created: '2026-06-20T09:00:00Z',
  refined: '2026-06-22T14:00:00Z',
  created_by: 'PO Erik',
  completed: null,
}

const SPRINT_OPTIONS = [
  { value: 'DD#20', label: 'DD#20 — Frontend-Rework Phase 3' },
  { value: 'DD#21', label: 'DD#21 — Backlog-Cutover' },
]
const MILESTONE_OPTIONS = [
  { value: 'M3 — Project Home Tab', label: 'M3 — Project Home Tab' },
  { value: 'M4 — Mobile', label: 'M4 — Mobile' },
]

// Gemeinsame Callback-/Filter-Args (alle no-op fn()).
const BASE_ARGS = {
  selectedIds: [],
  search: '',
  sprintOptions: SPRINT_OPTIONS,
  milestoneOptions: MILESTONE_OPTIONS,
  projectSlug: 'devd',
  bulkSprintId: '',
  statusFilters: ['new', 'refined'],
  typeFilter: '',
  sortOrder: 'key',
  showCancelled: false,
  activeFilterCount: 0,
  transitionError: null,
  transitionBusy: false,
  deleteBusy: false,
  // Farb-Knöpfe (PO-final 2026-06-24 = Live-Default des BacklogScreen)
  colorBackgroundSidebar: 'layer-1',
  colorBackgroundBacklogrow: 'layer-2',
  colorBackgroundPane: 'layer-1',
  onSearch: fn(), onClearSearch: fn(), onToggleStatusFilter: fn(), onChangeTypeFilter: fn(),
  onChangeSort: fn(), onToggleCancelled: fn(), onClearFilters: fn(),
  onCreateClick: fn(), onExport: fn(), onRetry: fn(), onOpen: fn(), onToggleMulti: fn(),
  onRowStatus: fn(), onClearSelection: fn(), onBulkAssignSprint: fn(), onBulkCancel: fn(),
  onChangeBulkSprint: fn(), onChangeMilestone: fn(), onChangeSprint: fn(), onChangeType: fn(),
  onChangePriority: fn(), onTransition: fn(), onRequestNotes: fn(), onDelete: fn(),
  onCopyMeta: fn(), onOpenFull: fn(), onPrevIssue: fn(), onNextIssue: fn(),
}

// Einheitliche Surface-Leiter für ALLE drei Farb-Knöpfe (FRAGE 2: vorher je Knopf
// andere Optionen). Theme-aware Layer-Aliase (R14). surface0≙layer-3, mantle≙layer-1.
const SURFACE_OPTIONS = ['transparent', 'base', 'layer-1', 'layer-2', 'layer-3', 'layer-4']

const meta = {
  title: '08 SCREENS/08.10 Backlog/BacklogScreen',
  component: BacklogScreen,
  tags: ['status:review', 'domain:backlog', 'design_version:v2'],
  parameters: { layout: 'fullscreen', fullBleed: true },
  argTypes: {
    colorBackgroundSidebar: { name: 'Canvas Sidebar (Listen-Panel)', control: 'select', options: SURFACE_OPTIONS },
    colorBackgroundBacklogrow: { name: 'Canvas Backlog-Row (Ruhe-Fill)', control: 'select', options: SURFACE_OPTIONS },
    colorBackgroundPane: { name: 'Canvas Detail-Pane', control: 'select', options: SURFACE_OPTIONS },
  },
  args: BASE_ARGS,
}
export default meta

// Render: Screen = volle Nutzersicht → in die kanonische AppShell (05.80) eingebettet
// (Default-Topbar + Default-Rail/AppShellRail + Content-Outlet), wie die echte App.
// Farb-Args → BacklogScreen-Surface-Props; eindeutiger Wrapper-Anker je Story.
const wrap = (args, ctx) => (
  <div data-ui={`screen.backlog.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="h-full">
    <AppShell breadcrumb={['DevDash', 'Backlog']}>
      <BacklogScreen
        {...args}
        sidebarSurface={args.colorBackgroundSidebar}
        rowRestTone={args.colorBackgroundBacklogrow}
        paneSurface={args.colorBackgroundPane}
      />
    </AppShell>
  </div>
)

// Default: ein gewähltes Issue (Detail-Pane sichtbar), Einzel-Zeile → kein Anker-Repeat.
export const Default = {
  render: wrap,
  args: { status: 'populated', items: [ITEMS[0]], activeId: 1, activeIssue: ACTIVE, pagerIndex: 0, pagerTotal: 1 },
}

// State_Populated: volle Liste + gewähltes Issue — die HOLISTISCHE Tuning-Story.
// (Exempt vom unique-gate: Multi-Row mit geteiltem backlog.list.row-Anker.)
export const State_Populated = {
  render: wrap,
  args: { status: 'populated', items: ITEMS, activeId: 1, activeIssue: ACTIVE, pagerIndex: 0, pagerTotal: ITEMS.length },
}

// State_Loading: Skeleton-Liste, kein Detail.
export const State_Loading = {
  render: wrap,
  args: { status: 'loading', items: [], activeIssue: null },
}

// State_Empty: leerer Backlog (Sidebar-EmptyState) + leerer Detail-Pane (ContentCard layer-3).
export const State_Empty = {
  render: wrap,
  args: { status: 'empty', items: [], activeIssue: null },
}

// State_Error: Fehler-Pane (ContentCard layer-3 + Retry).
export const State_Error = {
  render: wrap,
  args: { status: 'error', items: [], activeIssue: null, error: 'Backlog konnte nicht geladen werden.' },
}

// ============================================================================
// BacklogScreen_V2 — PoC Variante A (PO D07-A, 2026-06-24): testet, OB die volle
// EntityDetail-V2-Komposition (IssueDetails: Header-Pills + Akkordeon-Sektionen +
// ~13 Widgets) im schmalen Master-Detail-Pane funktioniert — als Alternative zum
// kompakten, bespoke BacklogDetails (inline-Select). KEIN Prod-Eingriff: story-
// lokale Komposition aus dem echten MasterDetailScreen-Template + IssueRow-Liste
// (links) + IssueDetails (rechter Pane). Pencil→xForm-Muster (D05/D06) ist in
// IssueDetails als onEdit-Affordanz angelegt; das Issue-xForm selbst kommt separat.
// ============================================================================

// Backlog-Issue (ACTIVE) → IssueDetails-`data`-Shape (13 Slots). Reale Felder +
// leichte Demo-Daten für die schwereren Slots (Reviews/Deps/Aktivität), damit der
// Pane voll bestückt sichtbar ist.
const V2_DATA = {
  id: 'DD-701',
  title: ITEMS[0].title,
  goal: 'PoC Variante A — der Backlog-Detail-Pane rendert die volle EntityDetail-V2-Komposition.',
  priority: 'hoch',
  status: 'refined',
  type: 'bug',
  description: [
    { key: 'goal', label: 'Goal', value: 'Surface-Elevation-Kanon im Backlog einhalten — Widgets (layer-3) heben sich vom Pane (layer-1) ab.' },
    { key: 'background', label: 'Background', value: 'Inline-Select-Editing bricht aus dem xForm-Muster; Alignment an EntityDetailsBase nötig.' },
  ],
  poNotes: [{ key: 'po', label: 'PO-Notes', value: 'Variante A testen: IssueDetails direkt im Master-Detail-Pane statt kompaktem BacklogDetails.' }],
  contextNotes: [{ key: 'ctx', label: 'Kontext (KI-Brief)', value: 'BacklogScreen.DetailPane; vgl. IssueDetails-Slots (06.60).' }],
  meta: [
    ['ID', 'DD-701'], ['Status', 'refined'], ['Priorität', 'P1'],
    ['Sprint', 'DD#20 — Frontend-Rework Phase 3'], ['Milestone', 'M3 — Project Home Tab'], ['Type', 'bug'],
  ],
  transitions: [
    { key: 'planned', label: 'Geplant', variant: 'primary' },
    { key: 'cancelled', label: 'Storniert', variant: 'danger' },
  ],
  reviews: [],
  dependencies: {
    predecessors: [{ key: 'DD-700', label: 'Layer-Aliase einführen', status: 'done' }],
    successors: [],
  },
  tags: [{ value: 'urgent', label: 'urgent', color: 'red' }],
  tagOptions: [
    { value: 'urgent', label: 'urgent', color: 'red', meta: '3×' },
    { value: 'frontend', label: 'frontend', color: 'blue', meta: '12×' },
    { value: 'tokens', label: 'tokens', color: 'green', meta: '5×' },
  ],
  userStories: [
    { key: 'us1', title: 'Widgets heben sich vom Pane ab', details: 'layer-3 über layer-1.', qa: 'AA-Kontrast.', verdict: 'pending' },
  ],
  attachments: [],
  files: ['src/components/ui/organisms/IssueDetails.jsx', 'src/index.css'],
  memories: [
    { key: 'm1', label: 'Surface-Elevation-Kanon 01.15', linked: true, href: '#' },
  ],
  activity: [
    { id: 1, action: 'create', timestamp: '2026-06-20 09:00:00', agent_id: 'PO Erik' },
    { id: 2, action: 'status_change', old_value: 'new', new_value: 'refined', timestamp: '2026-06-22 14:00:00' },
  ],
}

// Sidebar-Liste: IssueRow je ITEM, aktive Zeile = das im Pane gezeigte Issue.
const v2List = (args) => (
  <div data-ui="backlog.v2.list">
    {ITEMS.map((it, i) => (
      <IssueRow
        key={it.id}
        item={it}
        active={it.id === 1}
        isLast={i === ITEMS.length - 1}
        restTone={args.colorBackgroundBacklogrow}
        sprint={it.assigned_sprint ? { id: it.assigned_sprint, name: it.sprint_name } : null}
        onOpen={args.onOpen}
        onToggleMulti={args.onToggleMulti}
        dataUiScope="backlog.list.row"
      />
    ))}
  </div>
)

const wrapV2 = (args) => (
  <div data-ui="screen.backlog.v2" className="h-full">
    <AppShell breadcrumb={['DevDash', 'Backlog']}>
      <MasterDetailScreen
        header={{
          title: 'Backlog',
          goal: 'PoC Variante A — IssueDetails (volle EntityDetail-V2) im Detail-Pane.',
          pills: [{ k: 'count', label: 'Issues', value: ITEMS.length }],
          action: (
            <Button variant="primary" size="sm" leadingIcon={<Icon name="add" inherit size={14} />}>Neues Issue</Button>
          ),
        }}
        masterDetailScope="backlog.master-detail"
        sidebarSurface={args.colorBackgroundSidebar}
        paneSurface={args.colorBackgroundPane}
        sidebar={v2List(args)}
        detail={<IssueDetails data={V2_DATA} />}
      />
    </AppShell>
  </div>
)

export const BacklogScreen_V2 = {
  render: wrapV2,
  args: { status: 'populated', items: ITEMS, activeId: 1, activeIssue: ACTIVE, pagerIndex: 0, pagerTotal: ITEMS.length },
}
