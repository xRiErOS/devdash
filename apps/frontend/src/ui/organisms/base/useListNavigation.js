/**
 * useListNavigation — Keyboard-Steuerung der `ElementList` (APG Tree-Muster).
 * Der Container ist der EINZIGE Tab-Stop; der aktive Knoten wird per
 * `aria-activedescendant` markiert, nicht per echtem Fokus-Wechsel pro Zeile.
 * So gilt: Pfeil = Roving, Shift+Pfeil = Range markieren, Enter = öffnen,
 * Space = Selektion togglen, und ein einzelnes Tab verlässt die Liste Richtung
 * BulkActionBar (Feedback-Kette: markieren → Tab → Bulk-Aktion).
 *
 * Reine Index-Mathematik liegt in `listNavigation.js` (node-getestet). Dieser
 * Hook hält nur Fokus-/Anker-State und übersetzt Tastendrücke in Callbacks.
 *
 * @param {object} opts
 * @param {Array} opts.items - Baum (an flattenVisible)
 * @param {string[]} opts.expandedIds
 * @param {(item:object)=>void} [opts.onOpen] - Enter
 * @param {(id:string)=>void} [opts.onToggleSelect] - Space
 * @param {(ids:string[])=>void} [opts.onSelectRange] - Shift+Pfeil
 * @returns {{activeId:string|undefined, onKeyDown:Function, onFocus:Function}}
 */
import { useCallback, useRef, useState } from 'react'
import { flattenVisible, clampIndex, rangeIds } from './listNavigation.js'

export function useListNavigation({
  items = [], expandedIds = [], onOpen, onToggleSelect, onSelectRange,
}) {
  const flat = flattenVisible(items, expandedIds)
  const flatIds = flat.map((it) => it.id)
  const [focusIndex, setFocusIndex] = useState(-1)
  const anchorRef = useRef(-1)
  const containerRef = useRef(null)

  // Fokus betritt die Liste → ersten Knoten aktivieren (falls noch keiner).
  const onFocus = useCallback(() => {
    setFocusIndex((i) => (i < 0 && flatIds.length > 0 ? 0 : i))
  }, [flatIds.length])

  // Maus-Klick auf eine Zeile: Cursor dorthin setzen + DOM-Fokus zurück auf den
  // Container ziehen. Sonst behält der geklickte (tabIndex=-1-)Button den Fokus
  // und wird beim nächsten Pfeildruck zusätzlich :focus-visible (Doppel-Ring).
  const focusRow = useCallback((id) => {
    const idx = flatIds.indexOf(id)
    if (idx >= 0) { setFocusIndex(idx); anchorRef.current = idx }
    containerRef.current?.focus({ preventScroll: true })
  }, [flatIds])

  const onKeyDown = useCallback((e) => {
    const len = flatIds.length
    if (len === 0) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      const next = clampIndex(focusIndex, delta, len)
      const from = focusIndex < 0 ? next : focusIndex
      if (e.shiftKey) {
        if (anchorRef.current < 0) anchorRef.current = from
        onSelectRange?.(rangeIds(flatIds, anchorRef.current, next))
      } else {
        anchorRef.current = next // neuer Anker für die nächste Range
      }
      setFocusIndex(next)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusIndex >= 0) onOpen?.(flat[focusIndex])
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      if (focusIndex >= 0) onToggleSelect?.(flatIds[focusIndex])
    }
  }, [flatIds, flat, focusIndex, onOpen, onToggleSelect, onSelectRange])

  return {
    activeId: focusIndex >= 0 ? flatIds[focusIndex] : undefined,
    onKeyDown,
    onFocus,
    containerRef,
    focusRow,
  }
}
