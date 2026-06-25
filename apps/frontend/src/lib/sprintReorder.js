// DD-489 — Slice-aware sprint reorder math for the Next-3-Sprints card.
//
// The Overview card shows only the lowest-ranked (position asc) slice of the
// non-done sprints, but reordering must persist into the shared `sprints.position`
// space WITHOUT corrupting the positions of sprints outside the visible slice.
//
// Strategy: the visible rows occupy a fixed SET of `position` values (their own).
// When the user reorders the visible rows, we keep that exact set of positions and
// re-assign them to the rows in their NEW visual order. So only the visible rows'
// positions are touched, and they only swap among themselves — every out-of-view
// sprint keeps its position untouched.
//
// "Lowest rank on top" = sort ascending by position; index 0 = lowest position.

/**
 * Compute the reorder payload for PATCH /api/sprints/reorder from a visible
 * slice that has been moved from `fromId`'s slot to `toId`'s slot.
 *
 * @param {Array<{id:number, position?:number}>} visibleSprints - current visible
 *        rows IN DISPLAY ORDER (position ascending). The slice the user sees.
 * @param {number} fromId - id of the dragged row
 * @param {number} toId   - id of the row it was dropped onto
 * @returns {{items: Array<{id:number, position:number}>}|null}
 *          payload for the reorder endpoint, or null if it is a no-op / invalid.
 */
export function computeSliceReorder(visibleSprints, fromId, toId) {
  if (!Array.isArray(visibleSprints) || visibleSprints.length === 0) return null
  if (fromId == null || toId == null || fromId === toId) return null

  const ids = visibleSprints.map((s) => s.id)
  const oldIdx = ids.indexOf(fromId)
  const newIdx = ids.indexOf(toId)
  if (oldIdx < 0 || newIdx < 0) return null

  // The fixed set of position slots occupied by the visible rows, in display order.
  // Fall back to the row index if a position is missing (defensive — server always
  // sends position, but the slice is sorted by (position ?? id) upstream).
  const slots = visibleSprints.map((s, i) => (s.position != null ? s.position : i))

  // arrayMove(fromIdx -> toIdx) — identical to @dnd-kit's arrayMove: the dragged
  // id lands AT the drop target's index, shifting the others.
  const reorderedIds = [...ids]
  const [moved] = reorderedIds.splice(oldIdx, 1)
  reorderedIds.splice(newIdx, 0, moved)

  // Pair the (unchanged) slot set with the new id order.
  const items = reorderedIds.map((id, i) => ({ id, position: slots[i] }))
  return { items }
}

/**
 * Apply a computed reorder to the FULL sprint list optimistically, so the UI
 * reflects the new order before the server round-trip resolves. Only the
 * positions present in `items` are overwritten; every other sprint is untouched.
 *
 * @param {Array<object>} allSprints - the complete sprint list
 * @param {{items: Array<{id:number, position:number}>}} payload
 * @returns {Array<object>} a new list with patched positions (same objects, new position)
 */
export function applyReorder(allSprints, payload) {
  if (!payload || !Array.isArray(payload.items)) return allSprints
  const posById = new Map(payload.items.map((it) => [it.id, it.position]))
  return allSprints.map((s) =>
    posById.has(s.id) ? { ...s, position: posById.get(s.id) } : s,
  )
}
