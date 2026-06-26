/**
 * elementBrowser.demo — presentational Story-Daten für den ElementBrowser.
 * Bereits in Row-Form (kind/entityId/title/status/priority/issueType/children) —
 * NICHT die API-Shape (die liegt in backlog-list.json/sprint-list.json für MSW).
 *
 * Diese Insel speist die presentational Stories (Augenschein). Die Connected-
 * Story zieht stattdessen echte Fetches → MSW → Adapter (src/lib/elementsApi).
 */

// Flache Issue-Liste (Default/Backlog-Sicht).
export const FLAT_ISSUES = [
  { id: 'i1', kind: 'issue', issueType: 'feature', entityId: 'DD2-7', title: 'Project-Switcher im Header verdrahten', status: 'in_progress', priority: 1 },
  { id: 'i2', kind: 'issue', issueType: 'bug', entityId: 'DD2-8', title: 'Capture-Host-Guard 403 bei OPTIONS', status: 'to_review', priority: 1 },
  { id: 'i3', kind: 'issue', issueType: 'improvement', entityId: 'DD2-9', title: 'Render-Smoke-Glob auf _mockups erweitern', status: 'refined', priority: 2 },
  { id: 'i4', kind: 'issue', issueType: 'core', entityId: 'DD2-10', title: 'Storybook-Cache nach Tailwind-Bump leeren', status: 'new', priority: 3 },
  { id: 'i5', kind: 'issue', issueType: 'feature', entityId: 'DD2-11', title: 'FilterMenu um Status/Assignee/Sprint erweitern', status: 'planned', priority: 2 },
  { id: 'i6', kind: 'issue', issueType: 'bug', entityId: 'DD2-12', title: 'ListItemPreview Drag-Handle springt bei schmalem Pane', status: 'in_progress', priority: 2 },
  { id: 'i7', kind: 'issue', issueType: 'feature', entityId: 'DD2-13', title: 'BulkActionBar Slide-out beim Leeren der Selektion', status: 'done', priority: 3 },
  { id: 'i8', kind: 'issue', issueType: 'improvement', entityId: 'DD2-14', title: 'EntityId-Farbkollision mit StatusDot dokumentieren', status: 'passed', priority: 4 },
  { id: 'i9', kind: 'issue', issueType: 'core', entityId: 'DD2-15', title: 'Icon-Registry Audit: keine semantischen Dubletten', status: 'cancelled', priority: 4 },
  { id: 'i10', kind: 'issue', issueType: 'feature', entityId: 'DD2-16', title: 'EmptyState 2 Varianten (empty / no-match)', status: 'rejected', priority: 1 },
]

// Verschachtelt: Milestone > Sprint > Issue (NestedMixed-Story).
export const NESTED_TREE = [
  {
    id: 'm1', kind: 'milestone', entityId: 'M3', title: 'ElementBrowser-Reihe ausliefern', status: 'active', priority: 1,
    children: [
      {
        id: 's1', kind: 'sprint', entityId: 'DD#49', title: 'Browser-Organismus + Bausteine', status: 'active', priority: 2,
        children: [
          { id: 'i1', kind: 'issue', issueType: 'feature', entityId: 'DD2-7', title: 'Project-Switcher im Header verdrahten', status: 'in_progress', priority: 1 },
          { id: 'i2', kind: 'issue', issueType: 'bug', entityId: 'DD2-8', title: 'Capture-Host-Guard 403 bei OPTIONS', status: 'to_review', priority: 1 },
        ],
      },
      {
        id: 's2', kind: 'sprint', entityId: 'DD#50', title: 'Promote: _mockups → src/ui', status: 'planning', priority: 3,
        children: [
          { id: 'i5', kind: 'issue', issueType: 'feature', entityId: 'DD2-11', title: 'FilterMenu erweitern', status: 'planned', priority: 2 },
          { id: 'i3', kind: 'issue', issueType: 'improvement', entityId: 'DD2-9', title: 'Render-Smoke-Glob erweitern', status: 'refined', priority: 2 },
        ],
      },
    ],
  },
  {
    id: 'm2', kind: 'milestone', entityId: 'M4', title: 'Backlog- & SprintReview-Screen', status: 'planning', priority: 2,
    children: [
      {
        id: 's3', kind: 'sprint', entityId: 'DD#51', title: 'Connected-Wrapper + Daten-Layer', status: 'planning', priority: 2,
        children: [
          { id: 'i6', kind: 'issue', issueType: 'bug', entityId: 'DD2-12', title: 'Drag-Handle springt', status: 'new', priority: 2 },
        ],
      },
    ],
  },
]

// Aktive Filter-Chips (FilterBar-Demo).
export const ACTIVE_FILTERS = [
  { key: 'type-issue', label: 'Typ: Issue' },
  { key: 'status-open', label: 'Status: offen' },
  { key: 'prio-p1', label: 'P1' },
]
