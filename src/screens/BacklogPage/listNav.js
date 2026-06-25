// GF-2 T04 (DD-Review) — reine Navigations-Helfer für die Backlog-Liste.
// Trägt die Stepper-(DetailPager-)Logik UND die ArrowUp/Down-Tastatur-Navigation:
// beide bewegen `activeId` durch dieselbe gefilterte Reihenfolge. Pure (kein
// Router/State/DOM), damit TDD-bar und identisch in Klick- wie Tasten-Pfad.

// 1-basierte Position von `id` in `items` (0 = nicht enthalten / null).
export function indexOfId(items, id) {
  if (id == null) return 0
  const i = items.findIndex((it) => it.id === id)
  return i < 0 ? 0 : i + 1
}

// Auto-Select (PO 2026-06-24): es soll IMMER ein Item gewählt sein. Ein gültiges
// `currentId` (in `items`) bleibt erhalten; sonst (null / stale nach Projekt-
// wechsel oder Filter-Ausschluss) → erstes Item. Leere Liste → null. Pure.
export function resolveActiveId(items, currentId) {
  if (!items.length) return null
  if (currentId != null && items.some((it) => it.id === currentId)) return currentId
  return items[0].id
}

// Nachbar-id in Richtung `dir` ('prev'|'next'), ohne Wrap (an den Grenzen
// bleibt es stehen). Kein/unbekanntes aktives Element: next → erstes,
// prev → letztes. Leere Liste → null.
export function stepId(items, currentId, dir) {
  if (!items.length) return null
  const pos = indexOfId(items, currentId) // 1-basiert, 0 wenn unbekannt
  if (pos === 0) return dir === 'next' ? items[0].id : items[items.length - 1].id
  const idx = pos - 1
  const nextIdx = dir === 'next' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0)
  return items[nextIdx].id
}
