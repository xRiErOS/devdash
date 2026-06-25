// DD-352: Page-Header Breadcrumb-Labels. Eigenes Helper-Modul (nicht in
// Layout.jsx), damit der pure Resolver in einer node-env-Testsuite importierbar
// bleibt — Layout.jsx zieht den schweren Markdown-Editor-Dependency-Chain mit
// (Konvention analog sprintDetailHelpers.js).
//
// View-Segment = zweites Pfad-Segment hinter dem Slug (AppShell /:slug/<view>).
// Spiegelt die IconSidebar-Bezeichnungen.
export const VIEW_LABELS = {
  home: 'Project Home',
  board: 'Sprint Board',
  backlog: 'Backlog',
  issues: 'Issue',
  sprints: 'Sprint',
  review: 'Review',
  milestones: 'Milestones',
  roadmap: 'Roadmap',
  dependencies: 'Abhaengigkeiten',
  memories: 'Memories',
  settings: 'Einstellungen',
}

// Pure: löst das View-Label aus einem /:slug/<view>-Pfad. Unbekanntes/leeres
// Segment → 'Project Home' (Default-Landing).
export function resolveViewLabel(pathname) {
  const segs = String(pathname || '').split('/').filter(Boolean)
  const viewSeg = segs.length >= 2 ? segs[1] : ''
  return VIEW_LABELS[viewSeg] || 'Project Home'
}
