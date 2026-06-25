import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// DD-486 — Source-scan tests for OverviewTab live wiring.
// Pattern: source-grep (no @testing-library), same approach as m03-s02 tests.

const ROOT = resolve(import.meta.dirname, '../..')

function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

const OVERVIEW = 'src/components/ui/organisms/OverviewTab.jsx'
const VIEW = 'src/views/ProjectHomeView.jsx'

describe('DD-486 — OverviewTab live wiring (6 SOLL cards)', () => {
  // ---- 1. OverviewTab imports all 6 organism cards ----
  test('OverviewTab imports ProjectSummary (local) or renders summary content', () => {
    const s = src(OVERVIEW)
    // ProjectSummary is inlined in the stories as a local component.
    // In OverviewTab we port it inline or import it — either way it must render
    // the summary anchors. Template literal: `${SCOPE}.summary` or literal string.
    expect(s).toMatch(/SCOPE\}\.summary|project-home\.summary|["'`]project-home\.summary/)
  })

  test('OverviewTab imports VisionGoalsCard', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/VisionGoalsCard/)
  })

  test('OverviewTab imports ProjectMetaCard', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/ProjectMetaCard/)
  })

  test('OverviewTab imports CurrentMilestoneCard', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/CurrentMilestoneCard/)
  })

  test('OverviewTab imports Next3SprintsCard', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/Next3SprintsCard/)
  })

  test('OverviewTab imports MilestoneCreateModal', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/MilestoneCreateModal/)
  })

  test('OverviewTab imports SprintFormModal', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/SprintFormModal/)
  })

  // ---- 2. Live data hooks ----
  test('OverviewTab uses useProjectTodos for live todo data', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/useProjectTodos/)
  })

  test('OverviewTab uses useActiveProject for project meta', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/useActiveProject/)
  })

  test('OverviewTab fetches /api/milestones for milestone data', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/api\/milestones/)
  })

  test('OverviewTab fetches /api/sprints for sprint data', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/api\/sprints/)
  })

  // ---- 3. data-ui anchors (SCOPE = project-home) ----
  test('OverviewTab carries role=tabpanel + data-ui=project-home.tabs.overview', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/role="tabpanel"/)
    expect(s).toMatch(/data-ui="project-home\.tabs\.overview"/)
  })

  test('OverviewTab renders project-home.panel anchor (2-col main grid)', () => {
    const s = src(OVERVIEW)
    // Template literal renders as `${SCOPE}.panel` — match the pattern
    expect(s).toMatch(/SCOPE\}\.panel|["'`]project-home\.panel/)
  })

  test('OverviewTab renders project-home.sidebar anchor (right aside)', () => {
    const s = src(OVERVIEW)
    // Template literal renders as `${SCOPE}.sidebar` — match the pattern
    expect(s).toMatch(/SCOPE\}\.sidebar|["'`]project-home\.sidebar/)
  })

  // ---- 4. Token-clean (no inline style={{) ----
  test('OverviewTab has 0 inline style={{ literals', () => {
    const s = src(OVERVIEW)
    const count = (s.match(/style=\{\{/g) || []).length
    expect(count, 'inline style={{ count must be 0').toBe(0)
  })

  // ---- 5. Todos column wiring: ChecklistInputForm + search + SegmentedControl ----
  test('OverviewTab wires todo create (ChecklistInputForm or TodoInput)', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/ChecklistInputForm|TodoInput/)
  })

  test('OverviewTab uses filterAndSortTodos for todo filtering', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/filterAndSortTodos/)
  })

  test('OverviewTab renders ProjectTodoList', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/ProjectTodoList/)
  })

  test('OverviewTab renders ChecklistDetailModal or TodoDetailModal for todo detail', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/ChecklistDetailModal|TodoDetailModal/)
  })

  // ---- 6. TextEditModal for Summary / Vision / Goals editing ----
  test('OverviewTab imports TextEditModal for local-state editing', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/TextEditModal/)
  })

  // ---- 7. Self-contained aside (not delegated to SettingsSidebar) ----
  test('OverviewTab contains aside/sidebar grid with 340px and 48px collapse', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/340px/)
    expect(s).toMatch(/48px/)
  })

  // ---- 8. SstdTab must NOT import from OverviewTab (DD-538-fix: named exports removed) ----
  test('SstdTab does not import from OverviewTab (re-coupling regression guard)', () => {
    const sstdSrc = src('src/components/ui/organisms/SstdTab.jsx')
    expect(sstdSrc).not.toMatch(/from ['"]\.\/OverviewTab/)
  })

  // ---- 9. ProjectHomeView: SettingsSidebar suppressed on overview tab ----
  test('ProjectHomeView suppresses SettingsSidebar when tab===overview', () => {
    const s = src(VIEW)
    // Either: sidebar={null} assigned for overview, or isOverview variable + null sidebar
    expect(s).toMatch(/isOverview|overview.*sidebar.*null|sidebar.*null.*overview/ms)
  })

  test('ProjectHomeView passes sidebarCollapsed into OverviewTab for overview tab', () => {
    const s = src(VIEW)
    expect(s).toMatch(/sidebarCollapsed/)
    // OverviewTab receives sidebarCollapsed prop
    expect(s).toMatch(/OverviewTab[\s\S]{0,200}sidebarCollapsed|sidebarCollapsed[\s\S]{0,200}OverviewTab/m)
  })
})

// DD-490 — summary/vision/goals persistence wiring (source-grep, same pattern).
describe('DD-490 — OverviewTab summary/vision/goals persistence', () => {
  // ---- Seed local state from the loaded project row ----
  test('OverviewTab seeds achieved from project.summary_achieved', () => {
    expect(src(OVERVIEW)).toMatch(/project\.summary_achieved/)
  })

  test('OverviewTab seeds next from project.summary_next', () => {
    expect(src(OVERVIEW)).toMatch(/project\.summary_next/)
  })

  test('OverviewTab seeds vision from project.vision', () => {
    expect(src(OVERVIEW)).toMatch(/project\.vision/)
  })

  test('OverviewTab seeds goals from project.goals (newline-split)', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/project\.goals/)
    // goals is split on newline when seeding from the persisted string
    expect(s).toMatch(/\.split\(['"`]\\n['"`]\)/)
  })

  // ---- Persist via PUT /api/projects/:id ----
  test('OverviewTab issues a PUT to /api/projects on save', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/method:\s*['"`]PUT['"`]/)
    expect(s).toMatch(/\/api\/projects\//)
  })

  test('OverviewTab PUT carries X-Project-Id header', () => {
    expect(src(OVERVIEW)).toMatch(/X-Project-Id/)
  })

  test('OverviewTab persists all 4 summary columns by name', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/summary_achieved/)
    expect(s).toMatch(/summary_next/)
    expect(s).toMatch(/vision/)
    expect(s).toMatch(/goals/)
  })

  test('OverviewTab joins goals array with newline before persisting', () => {
    expect(src(OVERVIEW)).toMatch(/\.join\(['"`]\\n['"`]\)/)
  })
})
