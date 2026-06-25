// DD-289 R2 — Sprint-Board → Milestone-Detail-Page Navigation.
//
// PO-Reject (R1): "Über das Sprint-Board kann ich nicht zur Milestone Page
// navigieren." Fix: MilestonePill im SprintHeader + MilestoneSwimlane-Header
// werden klickbar und navigieren via react-router's `navigate('/milestone/:id')`.
//
// Diese Test-Suite ist ein source-level grep — sie verifiziert, dass das
// notwendige Verdrahtungs-Pattern in den drei beteiligten Dateien vorhanden
// ist:
//   - src/views/RoadmapBoard.jsx     → useNavigate + openMilestone + navigate('/milestone/...')
//   - src/components/MilestonePill.jsx       → onClick-Prop + button-Rendering
//   - src/components/MilestoneSwimlane.jsx   → onOpenMilestone-Prop + Header-Button
//
// Component-Render-Tests wären reichhaltiger, würden aber den Memory- und
// react-router-Boot-Aufwand für eine triviale Verdrahtung übersteigen — die
// existierende dd290/sprint-pill.test.jsx hält die UI-Pattern bereits ab.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..')

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('DD-289 R2 — RoadmapBoard navigiert zu /milestone/:id', () => {
  const roadmap = readSrc('src/views/RoadmapBoard.jsx')
  // DD-587: SprintHeader-/MilestonePill-/MilestoneSwimlane-Source-Asserts gelöscht —
  // sprintBoard/primitives.jsx, MilestonePill.jsx und MilestoneSwimlane.jsx wurden
  // ins _archive verschoben (import-closed dead set). Es bleibt die LIVE-Coverage
  // der RoadmapBoard-Navigations-Verdrahtung (useProjectNav + openMilestone).

  // DD-368: RoadmapBoard nutzt jetzt den slug-aware useProjectNav-Helper statt
  // des rohen useNavigate; die Milestone-Route ist /:slug/milestones/:id.
  // DD-510: Das Spalten-Board ruft useProjectNav direkt — kein roher
  // react-router-dom-Import mehr im Container nötig; nur useProjectNav gepinnt.
  test('RoadmapBoard nutzt slug-aware Navigation (useProjectNav)', () => {
    expect(roadmap).toMatch(/useProjectNav/)
  })

  test('RoadmapBoard erstellt einen openMilestone-Callback, der navigate("/milestones/...") aufruft', () => {
    // DD-368: Pattern: navigate(`/milestones/${milestoneId}`) (slug wird vom
    // useProjectNav-Helper vorangestellt).
    expect(roadmap).toMatch(/navigate\(\s*`\/milestones\/\$\{[^}]+\}`\s*\)/)
    expect(roadmap).toMatch(/openMilestone/)
  })
})
