import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  filterMilestones,
  sprintsOf,
  issueRollup,
  isDoneSprint,
} from '../../src/components/ui/organisms/RoadmapColumns.jsx'
import {
  colDragId,
  cardDragId,
  colDropId,
  parseDragId,
  computeColumnReorder,
  applyColumnReorder,
  computeCardMove,
} from '../../src/lib/roadmapBoardDnd.js'

// DD-510 — Roadmap-Board column-view rebuild (Story 1:1 + data + DnD).
// Two layers (React not renderable in vitest node-env, dd489 pattern):
//   (1) pure-helper unit tests for the column helpers + DnD reorder/assign math
//   (2) source-grep wiring assertions on the new container view + extraction

const ROOT = resolve(import.meta.dirname, '../..')
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8')

const VIEW = 'src/views/RoadmapBoard.jsx'
const STORY = 'src/components/screens/RoadmapBoard.stories.jsx'
const COLUMNS = 'src/components/ui/organisms/RoadmapColumns.jsx'

// ── 1a. RoadmapColumns pure helpers ────────────────────────────────────────────

describe('DD-510 — filterMilestones', () => {
  const ms = [
    { id: 1, status: 'completed' },
    { id: 2, status: 'active' },
    { id: 3, status: 'planning' },
    { id: 4, status: 'cancelled' },
  ]
  test('all → unchanged', () => {
    expect(filterMilestones(ms, 'all')).toHaveLength(4)
  })
  test('open → hides completed only', () => {
    const r = filterMilestones(ms, 'open')
    expect(r.map((m) => m.id)).toEqual([2, 3, 4])
  })
  test('specific status → exact match', () => {
    expect(filterMilestones(ms, 'planning').map((m) => m.id)).toEqual([3])
    expect(filterMilestones(ms, 'cancelled').map((m) => m.id)).toEqual([4])
  })
})

describe('DD-510 — sprintsOf (filter by milestone_id + sort by position)', () => {
  const sprints = [
    { id: 10, milestone_id: 1, position: 2 },
    { id: 11, milestone_id: 1, position: 1 },
    { id: 12, milestone_id: 2, position: 1 },
    { id: 13, milestone_id: null, position: 1 },
  ]
  test('filters to the milestone and sorts ascending by position', () => {
    expect(sprintsOf(sprints, 1).map((s) => s.id)).toEqual([11, 10])
  })
  test('null milestone → unassigned bucket', () => {
    expect(sprintsOf(sprints, null).map((s) => s.id)).toEqual([13])
  })
  test('empty bucket → empty array', () => {
    expect(sprintsOf(sprints, 999)).toEqual([])
  })
})

describe('DD-510 — issueRollup', () => {
  test('sums done + total across cards', () => {
    const cards = [
      { issue_done: 3, issue_total: 5 },
      { issue_done: 1, issue_total: 4 },
    ]
    expect(issueRollup(cards)).toEqual({ done: 4, total: 9 })
  })
  test('tolerates missing counts', () => {
    expect(issueRollup([{}, { issue_done: 2, issue_total: 2 }])).toEqual({ done: 2, total: 2 })
  })
  test('empty → zero', () => {
    expect(issueRollup([])).toEqual({ done: 0, total: 0 })
  })
})

describe('DD-510 — isDoneSprint', () => {
  test('completed/closed/cancelled are done', () => {
    expect(isDoneSprint({ status: 'completed' })).toBe(true)
    expect(isDoneSprint({ status: 'closed' })).toBe(true)
    expect(isDoneSprint({ status: 'cancelled' })).toBe(true)
  })
  test('planning/active/review are open', () => {
    expect(isDoneSprint({ status: 'planning' })).toBe(false)
    expect(isDoneSprint({ status: 'active' })).toBe(false)
    expect(isDoneSprint({ status: 'review' })).toBe(false)
  })
})

// ── 1b. DnD id helpers + parse ─────────────────────────────────────────────────

describe('DD-510 — DnD id helpers', () => {
  test('colDragId / colDropId / cardDragId encode kind + id', () => {
    expect(colDragId(5)).toBe('col:5')
    expect(colDragId(null)).toBe('col:unassigned')
    expect(colDropId(7)).toBe('drop:7')
    expect(colDropId(null)).toBe('drop:unassigned')
    expect(cardDragId(42)).toBe('card:42')
  })
  test('parseDragId round-trips', () => {
    expect(parseDragId('col:5')).toEqual({ kind: 'col', milestoneId: 5 })
    expect(parseDragId('col:unassigned')).toEqual({ kind: 'col', milestoneId: null })
    expect(parseDragId('drop:unassigned')).toEqual({ kind: 'drop', milestoneId: null })
    expect(parseDragId('card:42')).toEqual({ kind: 'card', sprintId: 42 })
    expect(parseDragId(123)).toEqual({ kind: null, raw: 123 })
  })
})

// ── 1c. Column reorder math (REQ-38) ───────────────────────────────────────────

describe('DD-510 — computeColumnReorder', () => {
  const ms = [
    { id: 16, position: 1 },
    { id: 17, position: 2 },
    { id: 18, position: 3 },
    { id: 19, position: 4 },
  ]
  test('no-op / invalid → null', () => {
    expect(computeColumnReorder(ms, 16, 16)).toBeNull()
    expect(computeColumnReorder(ms, null, 17)).toBeNull()
    expect(computeColumnReorder([], 1, 2)).toBeNull()
    expect(computeColumnReorder(ms, 999, 17)).toBeNull()
  })
  test('drag first onto third → new order', () => {
    expect(computeColumnReorder(ms, 16, 18)).toEqual({ ordered_ids: [17, 18, 16, 19] })
  })
  test('drag last onto first → new order', () => {
    expect(computeColumnReorder(ms, 19, 16)).toEqual({ ordered_ids: [19, 16, 17, 18] })
  })
  test('applyColumnReorder renumbers position 1..n', () => {
    const next = applyColumnReorder(ms, [17, 18, 16, 19])
    expect(next.find((m) => m.id === 17).position).toBe(1)
    expect(next.find((m) => m.id === 18).position).toBe(2)
    expect(next.find((m) => m.id === 16).position).toBe(3)
    expect(next.find((m) => m.id === 19).position).toBe(4)
  })
})

// ── 1d. Card move math — rank + assign in ONE PUT (REQ-39/41, DD-511) ───────────

describe('DD-510 — computeCardMove', () => {
  // Two columns: M1 = [s1@1, s2@2], M2 = [s3@1]; unassigned = [s4@1]
  const sprints = [
    { id: 1, milestone_id: 1, position: 1 },
    { id: 2, milestone_id: 1, position: 2 },
    { id: 3, milestone_id: 2, position: 1 },
    { id: 4, milestone_id: null, position: 1 },
  ]

  test('drop on self → null', () => {
    expect(computeCardMove(sprints, 1, { kind: 'card', sprintId: 1 })).toBeNull()
  })

  test('drop into same column at same rank → null (no-op)', () => {
    // s1 onto column-body of M1 → lands at end → rank changes (1→2) → NOT null.
    // but s2 onto M1 body → ends up last again at pos 2 → no-op.
    expect(computeCardMove(sprints, 2, { kind: 'drop', milestoneId: 1 })).toBeNull()
  })

  test('assign unassigned sprint onto a milestone column body', () => {
    const move = computeCardMove(sprints, 4, { kind: 'drop', milestoneId: 2 })
    expect(move.sprintId).toBe(4)
    expect(move.milestone_id).toBe(2)
    // M2 had [s3@1]; s4 appended → pos 2
    expect(move.position).toBe(2)
    const opt = move.optimistic.find((s) => s.id === 4)
    expect(opt.milestone_id).toBe(2)
    expect(opt.position).toBe(2)
  })

  test('rank within column: drop s2 onto s1 → s2 takes slot 1', () => {
    const move = computeCardMove(sprints, 2, { kind: 'card', sprintId: 1 })
    expect(move.milestone_id).toBe(1)
    expect(move.position).toBe(1)
    const opt = move.optimistic
    expect(opt.find((s) => s.id === 2).position).toBe(1)
    expect(opt.find((s) => s.id === 1).position).toBe(2)
  })

  // ── I2 (DD-510): downward drag onto the next card must MOVE (was a silent no-op).
  // Three-in-a-column fixture: M1 = [s1@1, s2@2, s3@3].
  const col3 = [
    { id: 1, milestone_id: 1, position: 1 },
    { id: 2, milestone_id: 1, position: 2 },
    { id: 3, milestone_id: 1, position: 3 },
  ]

  test('I2 — drag DOWN onto immediate next card moves past it (was the bug)', () => {
    // s1 dropped onto s2 → insert AFTER s2 → order [s2, s1, s3] → s1 at pos 2.
    const move = computeCardMove(col3, 1, { kind: 'card', sprintId: 2 })
    expect(move).not.toBeNull()
    expect(move.milestone_id).toBe(1)
    expect(move.position).toBe(2)
    const opt = move.optimistic
    expect(opt.find((s) => s.id === 2).position).toBe(1)
    expect(opt.find((s) => s.id === 1).position).toBe(2)
    expect(opt.find((s) => s.id === 3).position).toBe(3)
  })

  test('I2 — drag DOWN onto the last card moves to the bottom', () => {
    // s1 dropped onto s3 → insert AFTER s3 → order [s2, s3, s1] → s1 at pos 3.
    const move = computeCardMove(col3, 1, { kind: 'card', sprintId: 3 })
    expect(move).not.toBeNull()
    expect(move.position).toBe(3)
    const opt = move.optimistic
    expect(opt.find((s) => s.id === 2).position).toBe(1)
    expect(opt.find((s) => s.id === 3).position).toBe(2)
    expect(opt.find((s) => s.id === 1).position).toBe(3)
  })

  test('I2 — drag UP onto previous card inserts BEFORE it', () => {
    // s3 dropped onto s2 → insert BEFORE s2 → order [s1, s3, s2] → s3 at pos 2.
    const move = computeCardMove(col3, 3, { kind: 'card', sprintId: 2 })
    expect(move).not.toBeNull()
    expect(move.position).toBe(2)
    const opt = move.optimistic
    expect(opt.find((s) => s.id === 1).position).toBe(1)
    expect(opt.find((s) => s.id === 3).position).toBe(2)
    expect(opt.find((s) => s.id === 2).position).toBe(3)
  })

  test('I2 — drop on self via card target → null (no-op preserved)', () => {
    expect(computeCardMove(col3, 2, { kind: 'card', sprintId: 2 })).toBeNull()
  })

  test('I2 — drag DOWN keeps positions gap-consistent (contiguous 1..n)', () => {
    const move = computeCardMove(col3, 1, { kind: 'card', sprintId: 3 })
    const positions = move.optimistic
      .filter((s) => (s.milestone_id ?? null) === 1)
      .map((s) => s.position)
      .sort((a, b) => a - b)
    expect(positions).toEqual([1, 2, 3])
  })

  test('I2 — cross-column assign onto a foreign card still inserts BEFORE (unchanged)', () => {
    // s4 (unassigned) dropped onto s1 (M1=[s1@1, s2@2]) → assign to M1, before s1.
    const move = computeCardMove(sprints, 4, { kind: 'card', sprintId: 1 })
    expect(move.milestone_id).toBe(1)
    expect(move.position).toBe(1)
    const opt = move.optimistic
    expect(opt.find((s) => s.id === 4).position).toBe(1)
    expect(opt.find((s) => s.id === 1).position).toBe(2)
    expect(opt.find((s) => s.id === 2).position).toBe(3)
    // gap-consistent across the destination column
    const m1 = opt.filter((s) => (s.milestone_id ?? null) === 1).map((s) => s.position).sort((a, b) => a - b)
    expect(m1).toEqual([1, 2, 3])
  })

  test('assign onto Unassigned column (milestone_id → null)', () => {
    const move = computeCardMove(sprints, 1, { kind: 'drop', milestoneId: null })
    expect(move.milestone_id).toBeNull()
    expect(move.optimistic.find((s) => s.id === 1).milestone_id).toBeNull()
  })

  test('positions in target column are a contiguous 1..n slot set', () => {
    const move = computeCardMove(sprints, 4, { kind: 'drop', milestoneId: 1 })
    const m1 = move.optimistic.filter((s) => (s.milestone_id ?? null) === 1).map((s) => s.position).sort()
    expect(m1).toEqual([1, 2, 3])
  })
})

// ── 2. Source-grep wiring assertions ───────────────────────────────────────────

describe('DD-510 — view imports the canonical library + shared columns', () => {
  test('imports SprintCard indirectly via shared RoadmapColumns', () => {
    expect(src(COLUMNS)).toMatch(/import SprintCard from/)
  })
  test('view imports BoardPage + shared RoadmapColumns', () => {
    const s = src(VIEW)
    expect(s).toMatch(/import BoardPage from .*templates\/BoardPage/)
    expect(s).toMatch(/from '\.\.\/components\/ui\/organisms\/RoadmapColumns\.jsx'/)
    expect(s).toMatch(/MilestoneColumn/)
    expect(s).toMatch(/UnassignedColumn/)
  })
})

describe('DD-510 — story imports from the shared module (single source)', () => {
  test('story imports the shared columns instead of redefining them', () => {
    const s = src(STORY)
    expect(s).toMatch(/from '\.\.\/ui\/organisms\/RoadmapColumns\.jsx'/)
    expect(s).toMatch(/MilestoneColumn/)
    expect(s).toMatch(/UnassignedColumn/)
    expect(s).toMatch(/filterMilestones/)
  })
  test('story no longer defines its own MilestoneColumn/ColumnBody function', () => {
    const s = src(STORY)
    expect(s).not.toMatch(/function MilestoneColumn/)
    expect(s).not.toMatch(/function ColumnBody/)
    expect(s).not.toMatch(/function UnassignedColumn/)
  })
})

describe('DD-510 — DnD wiring (single DndContext, both gestures)', () => {
  const s = src(VIEW)
  test('exactly one DndContext with closestCorners', () => {
    expect(s.match(/<DndContext/g) || []).toHaveLength(1)
    expect(s).toMatch(/collisionDetection=\{closestCorners\}/)
  })
  test('column reorder persists via PATCH /api/milestones/reorder', () => {
    expect(s).toMatch(/\/api\/milestones\/reorder/)
    expect(s).toMatch(/ordered_ids/)
    expect(s).toMatch(/computeColumnReorder/)
  })
  test('card move persists milestone_id + position in one PUT /api/sprints/:id', () => {
    expect(s).toMatch(/\/api\/sprints\/\$\{move\.sprintId\}/)
    expect(s).toMatch(/method: 'PUT'/)
    expect(s).toMatch(/milestone_id: move\.milestone_id/)
    expect(s).toMatch(/position: move\.position/)
    expect(s).toMatch(/computeCardMove/)
  })
  test('optimistic update + revert on failure', () => {
    expect(s).toMatch(/setMilestones\(prev\)/)
    expect(s).toMatch(/setSprints\(prev\)/)
  })
})

describe('DD-510 — data fetch mirrors the IST inventory', () => {
  const s = src(VIEW)
  test('milestones with status=all + include_deferred', () => {
    expect(s).toMatch(/\/api\/milestones\?status=all&include_deferred=true/)
  })
  test('DoD fan-out via /dod-items (Promise.all)', () => {
    expect(s).toMatch(/dod-items/)
    expect(s).toMatch(/Promise\.all/)
    expect(s).toMatch(/d\.done/)
  })
  test('sprints mapping item_count→issue_total, done_count→issue_done', () => {
    expect(s).toMatch(/\/api\/sprints/)
    expect(s).toMatch(/issue_total: s\.item_count/)
    expect(s).toMatch(/issue_done: s\.done_count/)
  })
  test('issues grouped by assigned_sprint from /api/backlog', () => {
    expect(s).toMatch(/\/api\/backlog/)
    expect(s).toMatch(/assigned_sprint/)
  })
})

describe('DD-510 — navigation + projectStore + embedded', () => {
  const s = src(VIEW)
  test('onOpenMilestone/onOpenSprint/onOpenIssue navigate via useProjectNav', () => {
    expect(s).toMatch(/useProjectNav/)
    expect(s).toMatch(/navigate\(`\/milestones\/\$\{id\}`\)/)
    expect(s).toMatch(/navigate\(`\/sprints\/\$\{id\}`\)/)
    expect(s).toMatch(/navigate\(`\/issues\/\$\{id\}`\)/)
  })
  test('subscribes to projectStore for re-fetch', () => {
    expect(s).toMatch(/subscribeProject/)
  })
  test('embedded prop suppresses title + outer padding + document title', () => {
    expect(s).toMatch(/embedded = false/)
    expect(s).toMatch(/embedded \? '' : 'p-6'/)
    expect(s).toMatch(/useDocumentTitle\(embedded \? '' : 'Roadmap'/)
    // DD#82-r2: der Seitentitel wird in den app-shell.sub-header publiziert
    // (usePageTitle), embedded unterdrückt ihn weiterhin (leerer Titel).
    expect(s).toMatch(/usePageTitle\(embedded \? ''/)
  })
})

describe('DD-510 — data-ui roadmap-board scopes preserved', () => {
  test('view uses the roadmap-board SCOPE for root/board/filter', () => {
    const s = src(VIEW)
    expect(s).toMatch(/\$\{SCOPE\}\.root/)
    expect(s).toMatch(/\$\{SCOPE\}\.board/)
    expect(s).toMatch(/\$\{SCOPE\}\.filter/)
  })
  test('shared columns keep the column/card/unassigned data-ui anchors', () => {
    const s = src(COLUMNS)
    expect(s).toMatch(/SCOPE\}\.column\./)
    expect(s).toMatch(/SCOPE\}\.unassigned/)
    expect(s).toMatch(/\.drag-handle/)
  })
})

describe('DD-510 — DEFER list not built (clean omission)', () => {
  // Strip line + block comments so the DEFER-list mention in the file header
  // does not trip the assertions — we check for real CODE usage, not prose.
  const code = src(VIEW)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
  test('no CancelledColumn / showCancelled / hideCompleted / BackfillBanner in code', () => {
    expect(code).not.toMatch(/CancelledColumn/)
    expect(code).not.toMatch(/showCancelled/)
    expect(code).not.toMatch(/hideCompleted/)
    expect(code).not.toMatch(/BackfillBanner/)
  })
})
