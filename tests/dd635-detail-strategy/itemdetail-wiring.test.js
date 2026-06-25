// DD-635 (F3) — ItemDetail-Verdrahtung (Source-Guard, project_memory 333).
// Responsive Detail-Präsentation: Vollbild-Detailseite + Back-Stack <1024,
// Master-Detail-Two-Pane ≥1024 (E01/DD-528: harter Breakpoint-Swap statt
// Flex-Collapse — die Two-Pane-Geometrie darf @1024 nicht kollabieren).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = readFileSync(join(ROOT, 'src/views/ItemDetail.jsx'), 'utf8')

describe('DD-635 ItemDetail F3-Verdrahtung', () => {
  test('emittiert den konsistenten Back-Anker app-shell.detail.back', () => {
    expect(SRC).toContain('"app-shell.detail.back"')
  })

  test('importiert die geteilten F3-Detail-Bausteine', () => {
    expect(SRC).toMatch(/import\s+DetailStatusStepper\s+from/)
    expect(SRC).toMatch(/import\s+DetailBody\s+from/)
    expect(SRC).toMatch(/import\s+QuickMetaSheet\s+from/)
    expect(SRC).toMatch(/import\s+DetailEditScreen\s+from/)
  })

  test('bewahrt die bestehenden Parity-Anker (issue-detail.header.back/.meta/.body)', () => {
    expect(SRC).toContain('"issue-detail.header.back"')
    expect(SRC).toContain('"issue-detail.meta"')
    expect(SRC).toContain('"issue-detail.body"')
  })

  test('E01: Two-Pane (≥1024) vs. Vollbild-Mobile (<1024) per Conditional-Mount', () => {
    // Conditional-Mount via useMediaQuery — immer nur EIN Detail-Baum im DOM
    // (keine doppelten data-ui/testid → kein Playwright-Strict-Mode-Bruch).
    // E01/DD-528: der Two-Pane mountet vollständig, kein kollabierender Hidden-Pane.
    expect(SRC).toMatch(/import\s+useMediaQuery\s+from/)
    expect(SRC).toContain("useMediaQuery('(min-width: 1024px)', true)")
    expect(SRC).toMatch(/isDesktopDetail\s*\?/)
  })

  test('Status-Fokus ersetzt die alte ref-basierte Pipeline-Leiste im Pane', () => {
    expect(SRC).toMatch(/<DetailStatusStepper/)
    // Die alte 7-Schritt-PIPELINE_STATUSES-Leiste mit el.style.setProperty ist weg.
    expect(SRC).not.toContain("el.style.setProperty('--pip-color'")
  })
})
