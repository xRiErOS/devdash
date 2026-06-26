/**
 * listNavigation — pure Navigations-Logik für die Keyboard-Steuerung der
 * `ElementList` (APG Tree/Listbox-Muster). Reine Funktionen, kein React/DOM:
 * der Hook `useListNavigation` und die Tests teilen sich diese Logik.
 *
 * Spiegelt die sichtbare Reihenfolge von `ElementList.walk` (nur aufgeklappte
 * Knoten zählen) und liefert die Index-Mathematik für Roving-Fokus + Range-
 * Selektion (Shift+Pfeil).
 */

/**
 * Flacht den Baum in die sichtbare Navigations-Reihenfolge — Kinder zählen nur,
 * wenn ihr Knoten in `expandedIds` aufgeklappt ist (identisch zu ElementList).
 * @param {Array} items - Baum (jedes Item ggf. mit `children[]`)
 * @param {string[]} expandedIds - aufgeklappte Knoten
 * @returns {Array} sichtbare Items in Reihenfolge
 */
export function flattenVisible(items = [], expandedIds = []) {
  const out = []
  const walk = (list) => {
    for (const it of list) {
      out.push(it)
      const kids = it.children || []
      if (kids.length > 0 && expandedIds.includes(it.id)) walk(kids)
    }
  }
  walk(items)
  return out
}

/**
 * Nächster Fokus-Index, geklemmt an [0, len-1] (kein Wrap-around).
 * Index < 0 (noch kein Fokus) + Bewegung → erste Zeile.
 * @param {number} index - aktueller Index (-1 = keiner)
 * @param {number} delta - +1 (runter) | -1 (hoch)
 * @param {number} len - Anzahl sichtbarer Zeilen
 * @returns {number} neuer Index (-1 wenn Liste leer)
 */
export function clampIndex(index, delta, len) {
  if (len <= 0) return -1
  if (index < 0) return 0
  const next = index + delta
  if (next < 0) return 0
  if (next > len - 1) return len - 1
  return next
}

/**
 * Inklusive Range der ids zwischen Anker- und Fokus-Index (Reihenfolge egal).
 * @param {string[]} flatIds - ids in sichtbarer Reihenfolge
 * @param {number} anchorIndex
 * @param {number} focusIndex
 * @returns {string[]} ids von min..max (inklusive); [] bei ungültigem Index
 */
export function rangeIds(flatIds = [], anchorIndex, focusIndex) {
  if (anchorIndex < 0 || focusIndex < 0) return []
  const lo = Math.min(anchorIndex, focusIndex)
  const hi = Math.max(anchorIndex, focusIndex)
  return flatIds.slice(lo, hi + 1)
}
