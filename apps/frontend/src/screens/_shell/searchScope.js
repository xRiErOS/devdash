// src/screens/_shell/searchScope.js
// Reine Funktion: 2-Strang global-search-Scope aus dem Pathname (AppShell.contract.md).
// Tool-Landing (/projects) ODER Projekt-Home (/:slug/home) → 'all-active' (alle aktiven
// Projekte). Jeder andere Projekt-Kontext → 'project' (nur dieses Projekt, default).
// Container-Concern (R6), getrennt von useShell, damit node-env-testbar ohne React/Router.
export function searchScope(pathname) {
  const p = pathname || ''
  if (/^\/projects\/?$/.test(p)) return 'all-active'
  if (/\/home\/?$/.test(p)) return 'all-active'
  return 'project'
}
