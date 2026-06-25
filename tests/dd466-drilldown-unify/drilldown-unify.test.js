// DD-466 (455e): Drilldown-Vereinheitlichung + Dead-Code/Contract final.
//
// Source-Grep-Guards (Charakterisierung, kein Live-Render):
//   D03 — Die Drilldown-Helper (openMilestone/openItem/openSprint) sind im
//         RoadmapBoard-Container EINMAL definiert und werden an die Modi via
//         Props durchgereicht. Kein Mode-Modul definiert einen eigenen
//         navigate(`/milestones|/issues|/sprints`)-Pfad (Ausnahme: TimelineMode
//         hält einen dokumentierten Fallback, wenn standalone gemountet).
//   D05 — Dead-Code/Contract: kein _IssueRow / SortableIssueRow / roadmap.row
//         mehr in src/. roadmap.card.${id}.status ist der finale Picker-Pfad.
//
// Ergänzt die Bestands-Guards: dd463-mode-shell (AppShell-Mounts + Archetyp),
// dd366-roadmap-nav (RoadmapBoard navigiert statt Panel), t04 (Picker-Contract).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// DD-510 (DD#62): Im Spalten-Board heißen die Drilldown-Helper openMilestone/
// openSprint/openIssue und navigieren auf die kanonischen Detail-Routen (REQ-42/43).
// DD-510 removal: die STRUCK Mode-Modul-Asserts (SprintBoardMode/SwimlaneMode/
// TimelineMode lesen) + die Mode-Pass-Through-/openItem-/null-Guard-Asserts sind
// gelöscht — diese Architektur ist mit dem Cutover entfallen.
describe('DD-466 D03 — Drilldown-Helper im Container zentralisiert', () => {
  const container = src('src/views/RoadmapBoard.jsx')

  test('RoadmapBoard definiert openMilestone/openSprint/openIssue je genau einmal', () => {
    expect((container.match(/const openMilestone = useCallback/g) || []).length).toBe(1)
    expect((container.match(/const openIssue = useCallback/g) || []).length).toBe(1)
    expect((container.match(/const openSprint = useCallback/g) || []).length).toBe(1)
  })

  test('alle drei Helper navigieren auf die kanonischen Detail-Routen', () => {
    expect(container).toMatch(/navigate\(`\/milestones\/\$\{id\}`\)/)
    expect(container).toMatch(/navigate\(`\/issues\/\$\{id\}`\)/)
    expect(container).toMatch(/navigate\(`\/sprints\/\$\{id\}`\)/)
  })

  test('Container reicht onOpenItem NICHT mehr (toter Prop final entfernt)', () => {
    expect(container).not.toMatch(/onOpenItem=\{openItem\}/)
  })
})

describe('DD-466 D05 — Dead-Code/Contract final', () => {
  test('kein _IssueRow / SortableIssueRow mehr im Container (außer Kommentaren)', () => {
    // DD-510: die drei Mode-Module sind gelöscht — nur noch Container trägt den
    // finalen Picker-/Card-Contract.
    // DD-587: sprintBoard/primitives.jsx aus der Liste entfernt — ins _archive
    // verschoben (import-closed dead set). Es bleibt die Container-Coverage (live).
    const files = [
      'src/views/RoadmapBoard.jsx',
    ]
    for (const f of files) {
      const code = src(f)
      // Entferne Zeilen-Kommentare, dann auf Identifier prüfen.
      const noComments = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(noComments, `${f} darf kein _IssueRow tragen`).not.toMatch(/_IssueRow/)
      expect(noComments, `${f} darf kein SortableIssueRow tragen`).not.toMatch(/SortableIssueRow/)
    }
  })

  // DD-587: der roadmap.card-Status-Picker-Pfad-Assert gegen sprintBoard/primitives.jsx
  // ist entfernt — die Datei wurde ins _archive verschoben (import-closed dead set).
})
