import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// DD-492 — Source-scan tests for the copyable devd-cli todo reference in the
// ToDo area. Pattern: source-grep (no @testing-library), same approach as
// dd486-overview-tab. React is not renderable in the vitest node env.

const ROOT = resolve(import.meta.dirname, '../..')

function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

const CLI = 'src/components/ui/molecules/TodoCliHelp.jsx'
const OVERVIEW = 'src/components/ui/organisms/OverviewTab.jsx'
const STORY = 'src/components/screens/ProjectHome.stories.jsx'
const DEVD_CLI = 'bin/devd-cli.js'

describe('DD-492 — copyable devd-cli todo reference', () => {
  // ---- 1. The reference component surfaces the three todo commands ----
  test('TodoCliHelp surfaces todo list', () => {
    expect(src(CLI)).toMatch(/devd-cli todo list/)
  })

  test('TodoCliHelp surfaces todo add (create)', () => {
    expect(src(CLI)).toMatch(/devd-cli todo add/)
  })

  test('TodoCliHelp surfaces todo edit (update)', () => {
    expect(src(CLI)).toMatch(/devd-cli todo edit/)
  })

  // ---- 2. The surfaced strings actually match bin/devd-cli.js ----
  test('surfaced commands match the real CLI subcommands in bin/devd-cli.js', () => {
    const cli = src(DEVD_CLI)
    // The real verbs registered in the CLI handler map.
    expect(cli).toMatch(/['"]todo:list['"]/)
    expect(cli).toMatch(/['"]todo:add['"]/)
    expect(cli).toMatch(/['"]todo:edit['"]/)
  })

  // ---- 3. Copy affordance present (DD-675: via unified useCopyFeedback hook) ----
  test('TodoCliHelp wires a copy-to-clipboard affordance via the unified hook', () => {
    const s = src(CLI)
    // DD-675: clipboard-write + Feedback (transienter Check + Toast) zentralisiert
    // in useCopyFeedback — kein inline navigator.clipboard.writeText mehr.
    expect(s).toMatch(/useCopyFeedback/)
    expect(s).toMatch(/copy\(cmd/)
    expect(s).toMatch(/data-ui=\{`\$\{[a-zA-Z]+\}\.row\.copy`\}/)
  })

  // ---- 4. Compact / collapsible, keyboard-accessible (native <details>) ----
  test('TodoCliHelp renders a collapsible <details>/<summary> disclosure', () => {
    const s = src(CLI)
    expect(s).toMatch(/<details/)
    expect(s).toMatch(/<summary/)
  })

  // ---- 5. Token-clean (no inline style literal, no raw hex) ----
  test('TodoCliHelp has no inline style literal and no raw hex', () => {
    const s = src(CLI)
    expect(s).not.toMatch(/style=\{\{/)
    expect(s).not.toMatch(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/)
  })

  // ---- 6. Wired into the live ToDos area (OverviewTab RIGHT column) ----
  test('OverviewTab imports and renders TodoCliHelp in the todos area', () => {
    const s = src(OVERVIEW)
    expect(s).toMatch(/import TodoCliHelp from/)
    expect(s).toMatch(/<TodoCliHelp/)
    expect(s).toMatch(/\.todos\.cli/)
  })

  // ---- 7. Story=Code: same control modeled in the SOLL story TodosColumn ----
  test('ProjectHome SOLL story models TodoCliHelp in TodosColumn', () => {
    const s = src(STORY)
    expect(s).toMatch(/import TodoCliHelp from/)
    expect(s).toMatch(/<TodoCliHelp/)
    expect(s).toMatch(/\.todos\.cli/)
  })
})
