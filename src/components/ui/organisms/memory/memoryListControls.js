// Memory-Listen-Controls (reine Helfer, kein JSX) — GF-433 MemoryBrowse T1.
// Filter-Achsen (D03): category · stability · pinned · importance + FTS-Volltext.
// Sort (server-default): pinned DESC, dann updated_at DESC.

export function filterByCategory(items, category) {
  if (!category) return items
  return items.filter((m) => m.category === category)
}

export function filterByStability(items, stability) {
  if (!stability) return items
  return items.filter((m) => m.stability === stability)
}

export function filterByPinned(items, onlyPinned) {
  if (!onlyPinned) return items
  return items.filter((m) => Boolean(m.pinned))
}

export function filterByImportance(items, importance) {
  if (!importance) return items
  return items.filter((m) => m.importance === importance)
}

export function filterBySearch(items, q) {
  if (!q) return items
  const n = q.toLowerCase()
  return items.filter((m) =>
    `${m.summary ?? ''} ${m.content ?? ''} ${m.anchor ?? ''} ${m.tags ?? ''}`.toLowerCase().includes(n),
  )
}

export function sortPinnedFirst(items) {
  return [...items].sort((a, b) => {
    const p = Boolean(b.pinned) - Boolean(a.pinned)
    if (p !== 0) return p
    return String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))
  })
}
