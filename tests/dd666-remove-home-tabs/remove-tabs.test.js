import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { TAB_IDS } from '../../src/hooks/useProjectHomeTab.js'

// DD-666 — Backlog + Roadmap Tabs aus dem Project-Home-Tab-Set entfernt (redundant
// zu den nativen AppShell-Views + 'b'/'r'-Shortcuts). SOLL-Tab-Set = overview/sstd/
// memory. Die BacklogTab/RoadmapTab-Wrapper bleiben als Dead Code auf Platte (SOP
// D36), werden aber nicht mehr aus ProjectHomeView importiert/verdrahtet.

const ROOT = resolve(import.meta.dirname, '../..')
function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

describe('DD-666 — Backlog/Roadmap Tabs entfernt', () => {
  test('TAB_IDS enthält weder backlog noch roadmap', () => {
    expect(TAB_IDS).not.toContain('backlog')
    expect(TAB_IDS).not.toContain('roadmap')
  })

  test('TAB_IDS behält overview/sstd/memory in dieser Reihenfolge', () => {
    expect(TAB_IDS).toEqual(['overview', 'sstd', 'memory'])
  })

  test('ProjectHomeView importiert BacklogTab/RoadmapTab nicht mehr', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    expect(s).not.toMatch(/import\s+BacklogTab\b/)
    expect(s).not.toMatch(/import\s+RoadmapTab\b/)
  })

  test('TAB_COMPONENTS in ProjectHomeView hat keine backlog/roadmap-Keys', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    // Block zwischen `const TAB_COMPONENTS = {` und dem schließenden `}` isolieren.
    const m = s.match(/const TAB_COMPONENTS = \{([\s\S]*?)\}/)
    expect(m, 'TAB_COMPONENTS-Map nicht gefunden').toBeTruthy()
    const block = m[1]
    expect(block).not.toMatch(/\bbacklog\s*:/)
    expect(block).not.toMatch(/\broadmap\s*:/)
    // Positiv-Kontrolle: die SOLL-Keys sind weiterhin verdrahtet.
    expect(block).toMatch(/\boverview\s*:/)
    expect(block).toMatch(/\bsstd\s*:/)
    expect(block).toMatch(/\bmemory\s*:/)
  })
})
