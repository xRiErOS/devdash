import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { computeSliceReorder, applyReorder } from '../../src/lib/sprintReorder.js'

// DD-489 — Next-3-Sprints drag-rank + SprintFormModal create wiring.
// Two layers: (1) pure reorder-math unit tests, (2) source-grep wiring assertions
// (React not renderable in vitest node-env; same pattern as dd486-overview-tab).

const ROOT = resolve(import.meta.dirname, '../..')
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8')

const OVERVIEW = 'src/components/ui/organisms/OverviewTab.jsx'
const CARD = 'src/components/ui/organisms/Next3SprintsCard.jsx'

// ── 1. Pure reorder math ───────────────────────────────────────────────────────

describe('DD-489 — computeSliceReorder (slot-preserving slice reorder)', () => {
  // Visible slice in display order (position asc). The slot set = {3,7,9}.
  const visible = [
    { id: 10, position: 3 },
    { id: 20, position: 7 },
    { id: 30, position: 9 },
  ]

  test('returns null for no-op / invalid drags', () => {
    expect(computeSliceReorder(visible, 10, 10)).toBeNull()
    expect(computeSliceReorder(visible, null, 20)).toBeNull()
    expect(computeSliceReorder([], 1, 2)).toBeNull()
    expect(computeSliceReorder(visible, 999, 20)).toBeNull() // unknown id
  })

  test('moving top row to the bottom slot reuses the same slot set', () => {
    // drag id=10 (pos 3) onto id=30 (pos 9) → new order [20,30,10]
    const { items } = computeSliceReorder(visible, 10, 30)
    // slot set preserved (3,7,9 in display order) → assigned to new id order
    expect(items).toEqual([
      { id: 20, position: 3 },
      { id: 30, position: 7 },
      { id: 10, position: 9 },
    ])
  })

  test('moving bottom row to the top slot reuses the same slot set', () => {
    // drag id=30 (pos 9) onto id=10 (pos 3) → new order [30,10,20]
    const { items } = computeSliceReorder(visible, 30, 10)
    expect(items).toEqual([
      { id: 30, position: 3 },
      { id: 10, position: 7 },
      { id: 20, position: 9 },
    ])
  })

  test('the position SLOT SET is invariant under reorder (no slots invented)', () => {
    const before = visible.map(s => s.position).sort((a, b) => a - b)
    const { items } = computeSliceReorder(visible, 20, 10)
    const after = items.map(i => i.position).sort((a, b) => a - b)
    expect(after).toEqual(before) // exact same positions, only re-paired with ids
  })
})

describe('DD-489 — applyReorder (optimistic local apply, out-of-view untouched)', () => {
  test('only patches positions present in payload; other sprints untouched', () => {
    const all = [
      { id: 10, position: 3, name: 'A' },
      { id: 20, position: 7, name: 'B' },
      { id: 30, position: 9, name: 'C' },
      { id: 40, position: 99, name: 'OUT-OF-VIEW' }, // not in visible slice
    ]
    const payload = { items: [{ id: 10, position: 9 }, { id: 30, position: 3 }] }
    const next = applyReorder(all, payload)
    expect(next.find(s => s.id === 10).position).toBe(9)
    expect(next.find(s => s.id === 30).position).toBe(3)
    expect(next.find(s => s.id === 20).position).toBe(7) // untouched
    expect(next.find(s => s.id === 40).position).toBe(99) // out-of-view untouched
    expect(next.find(s => s.id === 40).name).toBe('OUT-OF-VIEW')
  })

  test('returns the list unchanged for an empty/invalid payload', () => {
    const all = [{ id: 1, position: 0 }]
    expect(applyReorder(all, null)).toBe(all)
    expect(applyReorder(all, {})).toBe(all)
  })
})

// ── 2. Source-grep wiring assertions ───────────────────────────────────────────

describe('DD-489 — Next3SprintsCard DnD wiring (consumer-driven)', () => {
  test('card imports @dnd-kit DndContext + SortableContext', () => {
    const s = src(CARD)
    expect(s).toMatch(/DndContext/)
    expect(s).toMatch(/SortableContext/)
    expect(s).toMatch(/useSortable/)
  })

  test('card exposes reorderable + onReorder props', () => {
    const s = src(CARD)
    expect(s).toMatch(/reorderable/)
    expect(s).toMatch(/onReorder/)
  })

  test('card keeps the drag-handle anchor (handle stays the drag source)', () => {
    expect(src(CARD)).toMatch(/sprint-row\.drag-handle/)
  })

  test('onDragEnd surfaces the raw gesture to onReorder(active.id, over.id)', () => {
    const s = src(CARD)
    expect(s).toMatch(/onDragEnd/)
    expect(s).toMatch(/onReorder\?\.\(active\.id,\s*over\.id\)/)
  })
})

describe('DD-489 — OverviewTab reorder persistence + create wiring', () => {
  test('OverviewTab imports the slice reorder helper', () => {
    expect(src(OVERVIEW)).toMatch(/computeSliceReorder/)
    expect(src(OVERVIEW)).toMatch(/applyReorder/)
  })

  test('OverviewTab PATCHes /api/sprints/reorder on drag end', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/\/api\/sprints\/reorder/)
    expect(s).toMatch(/method:\s*['"`]PATCH['"`]/)
  })

  test('OverviewTab passes reorderable + onReorder into Next3SprintsCard', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/reorderable/)
    expect(s).toMatch(/onReorder=\{handleSprintReorder\}/)
  })

  test('OverviewTab POSTs /api/sprints to create a sprint', () => {
    const s = src(OVERVIEW)
    // POST against the bare /api/sprints endpoint (not the reorder sub-path)
    expect(s).toMatch(/method:\s*['"`]POST['"`]/)
    expect(s).toMatch(/['"`]\/api\/sprints['"`]/)
  })

  test('SprintFormModal onSubmit is wired (not a no-op) and refreshes the list', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/onSubmit=\{handleSprintSubmit\}/)
    expect(s).toMatch(/loadSprints/) // refresh after create / on failure resync
  })

  test('reorder + create both carry X-Project-Id', () => {
    expect(src(OVERVIEW)).toMatch(/X-Project-Id/)
  })
})
