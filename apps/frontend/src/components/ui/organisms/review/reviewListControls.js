// Review-Listen-Controls (reine Helfer, kein JSX) — GF-2 T5.
// Verdict-Rang fuer die Master-Liste: offen(pending) < zurueckgeworfen(rejected|planned) < passed.
// Backend-B01: ein abgelehntes Issue landet je nach lifecycle.js auf `rejected` ODER `planned`
// (beide = "zurueckgeworfen") → gleicher Rang, sonst faellt es aus der Verdict-Spalte.
const RANK = { pending: 0, open: 0, rejected: 1, planned: 1, not_passed: 1, passed: 2 }

export function sortByVerdict(issues, dir = 'asc') {
  const s = [...issues].sort((a, b) => (RANK[a.review_status] ?? 0) - (RANK[b.review_status] ?? 0))
  return dir === 'desc' ? s.reverse() : s
}

export function filterBySearch(issues, q) {
  if (!q) return issues
  const n = q.toLowerCase()
  return issues.filter((i) => `${i.key} ${i.title}`.toLowerCase().includes(n))
}
