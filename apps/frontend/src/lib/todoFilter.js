// DD-363 (DD#49 M3-Finalisierung): Pure Filter-/Sort-Logik für den Project-Home ToDo-Tab.
// KEINE React-Imports — testbar als reiner Node-Helper.
//
// Default-Ansicht (search leer, showAll=false): offene ToDos + HEUTE erledigte. Erledigte
// von früher und cancelled werden ausgeblendet, damit die Vollliste nicht unbegrenzt wächst.
// "Alle anzeigen" (showAll=true) zeigt alles in Positions-Reihenfolge (= reorder-fähig).
// Suche überschreibt beide Modi: matcht über label/details, sortiert offen-vor-erledigt.

/**
 * Prüft, ob completed_at (UTC-String 'YYYY-MM-DD HH:MM:SS' aus SQLite datetime('now'))
 * in der lokalen Zeitzone auf denselben Kalendertag wie `now` fällt.
 * Robust gegen null/leeren/ungültigen Input → dann false.
 *
 * @param {string|null|undefined} completed_at
 * @param {Date} now
 * @returns {boolean}
 */
export function isCompletedToday(completed_at, now = new Date()) {
  if (!completed_at || typeof completed_at !== 'string') return false
  const trimmed = completed_at.trim()
  if (!trimmed) return false
  // SQLite liefert UTC ohne TZ-Marker → explizit als UTC parsen.
  const parsed = new Date(trimmed.replace(' ', 'T') + 'Z')
  if (Number.isNaN(parsed.getTime())) return false
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  )
}

const isOpenLike = (t) => t.status !== 'done' && t.status !== 'cancelled'

/**
 * Filtert und sortiert die ToDo-Liste für den Tab.
 *
 * @param {Array} todos
 * @param {object} opts
 * @param {boolean} [opts.showAll=false]
 * @param {string}  [opts.search='']
 * @param {Date}    [opts.now=new Date()]
 * @returns {Array} neue, gefilterte+sortierte Liste (Eingabe bleibt unverändert)
 */
export function filterAndSortTodos(todos, { showAll = false, search = '', now = new Date() } = {}) {
  if (!Array.isArray(todos)) return []
  const query = typeof search === 'string' ? search.trim().toLowerCase() : ''

  if (query) {
    // Suche ignoriert Default-Filter und showAll.
    const matched = todos.filter((t) => {
      const label = (t.label || '').toLowerCase()
      const details = (t.details || '').toLowerCase()
      return label.includes(query) || details.includes(query)
    })
    // Sortierung: offen-artig zuerst, dann done, cancelled ans Ende; je Gruppe position ASC.
    const rank = (t) => {
      if (isOpenLike(t)) return 0
      if (t.status === 'done') return 1
      return 2 // cancelled
    }
    return matched.slice().sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      return (a.position ?? 0) - (b.position ?? 0)
    })
  }

  if (showAll) {
    // Vollliste in Positions-Reihenfolge (reorder-fähig).
    return todos.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }

  // Default: offene + HEUTE erledigte. cancelled nicht zeigen.
  const filtered = todos.filter((t) => {
    if (t.status === 'open') return true
    if (t.status === 'done') return isCompletedToday(t.completed_at, now)
    return false
  })
  return filtered.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}
