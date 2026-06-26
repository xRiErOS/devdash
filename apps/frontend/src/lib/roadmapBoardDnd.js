/**
 * roadmapBoardDnd — reine DnD-Mathe für das RoadmapBoard (kein React, kein Store).
 *
 * Trennt die Berechnung (Reorder-Order, Dep-Validierung, Card-Ziel) von der
 * React-Verdrahtung im Container. So testbar im Node-Env (vitest, SSR) ohne DOM.
 *
 * IDs sind als Strings über @dnd-kit verdrahtet, damit Spalten- und Card-Drags
 * sich nie überschneiden:
 *   - Drag-Quelle Spalte  → `col:<milestoneId>`
 *   - Drag-Quelle Card    → `card:<sprintId>`
 *   - Drop-Ziel  Spalte   → `drop:<milestoneId>` bzw. `drop:null` (Unassigned)
 *
 * Datenformen (presentational, aus /api/milestones gemappt):
 *   cols  : Array<{ id:number, name:string, position:number }>
 *   deps  : Array<{ id:number, predecessor_id:number, successor_id:number }>
 *   cards : Array<{ id:number, milestone_id:number|null, position:number }>
 */

export function colDragId(milestoneId) {
  return `col:${milestoneId}`
}

export function cardDragId(sprintId) {
  return `card:${sprintId}`
}

export function colDropId(milestoneId) {
  return milestoneId == null ? 'drop:null' : `drop:${milestoneId}`
}

/**
 * Zerlegt eine dnd-id in { type, id }. `id` ist numerisch (oder null für
 * `drop:null`). Unbekanntes Format → { type:null, id:null }.
 * @param {string|number|null} dndId
 * @returns {{ type:'col'|'card'|'drop'|null, id:number|null }}
 */
export function parseDragId(dndId) {
  if (dndId == null) return { type: null, id: null }
  const raw = String(dndId)
  const sep = raw.indexOf(':')
  if (sep < 0) return { type: null, id: null }
  const type = raw.slice(0, sep)
  const rest = raw.slice(sep + 1)
  if (type !== 'col' && type !== 'card' && type !== 'drop') return { type: null, id: null }
  if (rest === 'null' || rest === '') return { type, id: null }
  const n = Number(rest)
  return { type, id: Number.isNaN(n) ? null : n }
}

// Reines arrayMove (dnd-kit-Semantik): Element von `from` raus, an `to` einsetzen.
function arrayMove(arr, from, to) {
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

// Spalten nach position sortiert → reine Milestone-ID-Liste.
function orderedIdsOf(cols) {
  return cols
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c) => c.id)
}

/**
 * Neue Spalten-Reihenfolge nach einem Spalten-Drag.
 * @param {Array} cols - Milestone-Spalten
 * @param {string|number} activeId - gezogene Spalte (col:<id> oder roh)
 * @param {string|number} overId - Spalte/Drop unter dem Cursor
 * @returns {number[]} geordnete milestone-ids
 */
export function computeColumnReorder(cols, activeId, overId) {
  const ids = orderedIdsOf(cols)
  const activeMid = parseDragId(activeId).id ?? Number(activeId)
  const overMid = parseDragId(overId).id ?? Number(overId)
  const from = ids.indexOf(activeMid)
  const to = ids.indexOf(overMid)
  if (from < 0 || to < 0 || from === to) return ids
  return arrayMove(ids, from, to)
}

/**
 * Prüft, ob eine geordnete Spalten-Folge keine Abhängigkeit verletzt:
 * jeder Vorgänger muss VOR seinem Nachfolger stehen.
 * @param {Array} deps - { predecessor_id, successor_id }[]
 * @param {number[]} orderedIds
 * @returns {boolean} true = gültig
 */
export function validateColumnReorder(deps, orderedIds) {
  const idx = new Map(orderedIds.map((id, i) => [id, i]))
  for (const dep of deps || []) {
    const p = idx.get(dep.predecessor_id)
    const s = idx.get(dep.successor_id)
    if (p == null || s == null) continue // ein Ende nicht im Board → ignorieren
    if (p >= s) return false
  }
  return true
}

/**
 * Wendet eine geordnete ID-Folge auf die Spalten an: neue Objekte mit
 * aktualisierter `position`. Spalten ohne Eintrag in orderedIds werden
 * stabil ans Ende gehängt (defensiv).
 * @returns {Array} neue Spalten-Liste
 */
export function applyColumnReorder(cols, orderedIds) {
  const byId = new Map(cols.map((c) => [c.id, c]))
  const seen = new Set()
  const out = []
  orderedIds.forEach((id, i) => {
    const col = byId.get(id)
    if (col) {
      out.push({ ...col, position: i })
      seen.add(id)
    }
  })
  cols
    .filter((c) => !seen.has(c.id))
    .sort((a, b) => a.position - b.position)
    .forEach((c) => out.push({ ...c, position: out.length }))
  return out
}

/**
 * Zielort einer gezogenen Card. Liegt das Drop-Ziel auf einer anderen Card
 * derselben Zielspalte, wird an deren Index eingefügt, sonst ans Ende.
 * @param {Array} cards - alle Sprints
 * @param {string|number} activeId - gezogene Card (card:<id>)
 * @param {string|number|null} overId - Element unter dem Cursor (card/drop)
 * @param {number|null} targetColId - Zielspalte (milestone_id|null=Unassigned)
 * @returns {{ milestone_id:number|null, position:number }}
 */
export function computeCardMove(cards, activeId, overId, targetColId) {
  const activeSid = parseDragId(activeId).id ?? Number(activeId)
  const inTarget = cards
    .filter((c) => c.milestone_id === targetColId && c.id !== activeSid)
    .sort((a, b) => a.position - b.position)

  const over = parseDragId(overId)
  let position = inTarget.length // Default: ans Ende
  if (over.type === 'card' && over.id != null) {
    const overIdx = inTarget.findIndex((c) => c.id === over.id)
    if (overIdx >= 0) position = overIdx
  }
  return { milestone_id: targetColId, position }
}
