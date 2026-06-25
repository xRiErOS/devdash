// roadmapBoardDnd — pure DnD math for the Roadmap-Board column view (DD-510).
//
// React-frei und seiteneffektfrei → direkt unit-testbar (vitest node-env).
// Zwei Gesten teilen sich EINEN DndContext im Container:
//   1. Spalten-Reorder (Milestone-Drag-Handle) → computeColumnReorder
//   2. Card-Drag (Rang in der Spalte ODER Zuordnung auf andere Spalte) →
//      computeCardMove
//
// DnD-IDs (Strings, damit @dnd-kit sie sauber trennt):
//   Spalte:   `col:<milestoneId>` | `col:unassigned`
//   Card:     `card:<sprintId>`
//   Droppable Spaltenkörper: `drop:<milestoneId>` | `drop:unassigned`

// ── ID-Helfer ───────────────────────────────────────────────────────────────
export const colDragId = (milestoneId) => `col:${milestoneId == null ? 'unassigned' : milestoneId}`
export const cardDragId = (sprintId) => `card:${sprintId}`
export const colDropId = (milestoneId) => `drop:${milestoneId == null ? 'unassigned' : milestoneId}`

export function parseDragId(id) {
  if (typeof id !== 'string') return { kind: null, raw: id }
  const [kind, rest] = id.split(':')
  if (kind === 'col') return { kind: 'col', milestoneId: rest === 'unassigned' ? null : Number(rest) }
  if (kind === 'card') return { kind: 'card', sprintId: Number(rest) }
  if (kind === 'drop') return { kind: 'drop', milestoneId: rest === 'unassigned' ? null : Number(rest) }
  return { kind: null, raw: id }
}

// ── 1. Spalten-Reorder (Milestone position) ─────────────────────────────────
/**
 * Berechnet die neue Milestone-Reihenfolge nach einem Spalten-Drag.
 * @param {Array<{id:number, position:number}>} milestones - aktuelle Reihenfolge (display order)
 * @param {number} fromId - gezogene Milestone-Id
 * @param {number} toId   - Drop-Ziel-Milestone-Id
 * @returns {{ordered_ids: number[]}|null} Payload für PATCH /api/milestones/reorder, oder null (no-op).
 */
export function computeColumnReorder(milestones, fromId, toId) {
  if (!Array.isArray(milestones) || milestones.length === 0) return null
  if (fromId == null || toId == null || fromId === toId) return null
  const ids = [...milestones].sort((a, b) => a.position - b.position).map((m) => m.id)
  const oldIdx = ids.indexOf(fromId)
  const newIdx = ids.indexOf(toId)
  if (oldIdx < 0 || newIdx < 0) return null
  const [moved] = ids.splice(oldIdx, 1)
  ids.splice(newIdx, 0, moved)
  return { ordered_ids: ids }
}

/** Optimistisches Anwenden der neuen Spalten-Reihenfolge auf die lokale Liste. */
export function applyColumnReorder(milestones, orderedIds) {
  if (!Array.isArray(orderedIds)) return milestones
  const pos = new Map(orderedIds.map((id, i) => [id, i + 1]))
  return milestones.map((m) => (pos.has(m.id) ? { ...m, position: pos.get(m.id) } : m))
}

// ── 2. Card-Move (Rang + Zuordnung) ─────────────────────────────────────────
/**
 * Berechnet das Ergebnis eines Card-Drags: Rang innerhalb der aktuellen Spalte
 * (Drop auf eine andere Card) ODER Zuordnung zu einer anderen Spalte (Drop auf
 * einen Spaltenkörper / fremde Card). milestone_id + position persistieren in
 * EINEM PUT /api/sprints/:id-Call (DD-511).
 *
 * @param {Array<object>} sprints - alle Sprints (mit id, milestone_id, position)
 * @param {number} activeSprintId - gezogener Sprint
 * @param {{kind:string, sprintId?:number, milestoneId?:number|null}} over - geparstes Drop-Ziel
 * @returns {{sprintId:number, milestone_id:number|null, position:number, optimistic:Array}|null}
 */
export function computeCardMove(sprints, activeSprintId, over) {
  if (!Array.isArray(sprints) || activeSprintId == null || !over || over.kind == null) return null
  const active = sprints.find((s) => s.id === activeSprintId)
  if (!active) return null

  // Ziel-Milestone bestimmen.
  let targetMilestoneId
  let beforeSprintId = null // Card, auf die gedroppt wurde (für Rang); null = ans Ende
  if (over.kind === 'card') {
    if (over.sprintId === activeSprintId) return null // Drop auf sich selbst
    const target = sprints.find((s) => s.id === over.sprintId)
    if (!target) return null
    targetMilestoneId = target.milestone_id ?? null
    beforeSprintId = over.sprintId
  } else if (over.kind === 'drop') {
    targetMilestoneId = over.milestoneId ?? null
  } else {
    return null
  }

  // Ziel-Spalten-Mitglieder (ohne den aktiven), in display order.
  const colMembers = sprints
    .filter((s) => (s.milestone_id ?? null) === targetMilestoneId && s.id !== activeSprintId)
    .sort((a, b) => a.position - b.position)

  const sameMilestone = (active.milestone_id ?? null) === targetMilestoneId

  // Neue Reihenfolge der Ziel-Spalte aufbauen (Standard-Sortable-Semantik, I2):
  // Drop auf eine Over-Card. Beim ABWÄRTS-Ziehen innerhalb derselben Spalte
  // (Quelle vor Ziel) wird HINTER die Over-Card eingefügt, sonst DAVOR — sonst
  // wäre ein Drag auf den direkten Nachfolger ein stiller No-op (war der Bug).
  // Cross-Column-Zuweisung: immer DAVOR (es gibt keine „Quelle vor Ziel"-Relation).
  let ordered
  if (beforeSprintId != null) {
    const idx = colMembers.findIndex((s) => s.id === beforeSprintId)
    ordered = [...colMembers]
    if (idx < 0) {
      ordered.push(active)
    } else {
      // Abwärts ziehen = Quelle steht in derselben Spalte VOR dem Ziel.
      const overSprint = sprints.find((s) => s.id === beforeSprintId)
      const draggingDown = sameMilestone && overSprint != null && active.position < overSprint.position
      ordered.splice(draggingDown ? idx + 1 : idx, 0, active)
    }
  } else {
    ordered = [...colMembers, active]
  }

  // No-op: gleiche Spalte UND gleiche Reihenfolge wie zuvor.
  const newPos = ordered.findIndex((s) => s.id === activeSprintId) + 1
  if (sameMilestone && newPos === active.position) return null

  // 1-basierte fortlaufende Positionen für die Ziel-Spalte.
  const repositioned = ordered.map((s, i) => ({ id: s.id, position: i + 1 }))
  const posById = new Map(repositioned.map((r) => [r.id, r.position]))

  const optimistic = sprints.map((s) => {
    if (s.id === activeSprintId) {
      return { ...s, milestone_id: targetMilestoneId, position: posById.get(s.id) ?? newPos }
    }
    if (posById.has(s.id)) return { ...s, position: posById.get(s.id) }
    return s
  })

  return {
    sprintId: activeSprintId,
    milestone_id: targetMilestoneId,
    position: posById.get(activeSprintId) ?? newPos,
    optimistic,
  }
}
