// src/screens/_shell/navItems.js
// Routen-Vertrag als Daten (Master-Doc §3). Ziel-Komponenten werden in routes.jsx verdrahtet.
export const GLOBAL_ROUTES = [
  { path: 'projects', screen: 'ProjectsLanding' },
  { path: 'settings', screen: 'GlobalSettings' },
  { path: 'settings/sops', screen: 'SopList' },
  { path: 'settings/sops/:key', screen: 'SopView' },
]

// Rail-Items = nur 4 Quick-Access-Sektionen (PO 2026-06-24): home/roadmap/backlog/memories.
// milestones/sprints/issues/settings bleiben Routen, aber NICHT in der Rail (obsolet/doppelt als
// Rail-Item — milestones/sprints/issues via Roadmap/Entity-Links; settings via gepinnte Rail-Zeile).
export const PROJECT_ROUTES = [
  { path: 'home', screen: 'ProjectHome', railKey: 'home', label: 'Home' },
  { path: 'roadmap', screen: 'RoadmapBoard', railKey: 'roadmap', label: 'Roadmap' },
  { path: 'milestones', screen: 'MilestonesList' },
  { path: 'milestones/:id', screen: 'MilestoneDetail' },
  { path: 'sprints', screen: 'SprintsList' },
  { path: 'sprints/:id', screen: 'SprintDetail' },
  { path: 'issues', screen: 'IssuesList' },
  { path: 'issues/:id', screen: 'IssueDetail' },
  { path: 'backlog', screen: 'BacklogPage', railKey: 'backlog', label: 'Backlog' },
  { path: 'review/:sprintId', screen: 'SprintReview' },
  { path: 'memories', screen: 'ProjectMemoryView', railKey: 'memories', label: 'Memories' },
  { path: 'settings', screen: 'ProjectSettings' },
]

// Bewusst NICHT übernommen (Master-Doc §3 „Gedroppt").
export const DROPPED_PATHS = [
  'board', 'dependencies', 'memories/global', 'settings/api-keys',
  'issues/:id-legacy', 'item/:id', 'sprint/:id', 'milestone/:id',
  'project/:id', 'dashboard/home', 'roadmap-v2',
]

// Rail-Items = projekt-scoped Routen mit railKey, in Reihenfolge.
export const RAIL_ITEMS = PROJECT_ROUTES.filter((r) => r.railKey)
