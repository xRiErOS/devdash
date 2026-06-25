// DD-366 — Roadmap-Klick navigiert zur Milestone-Detailseite statt Side-Panel.
//
// Source-level grep (Pattern analog tests/dd289/r2/roadmap-milestone-navigation.test.js):
//   - RoadmapBoard.jsx (DD-510 Spalten-Board, ersetzt TimelineMode): useProjectNav +
//     navigate(`/milestones/${id}`), KEIN MilestoneDetailPanel, KEIN setSelected mehr.
//   - MilestoneDetail.jsx: importiert + nutzt den editierbaren MilestoneDodEditor (DD-588: ui/ Organism).
//   - Container-Logik (POST .../dod-items, DELETE /api/dod-items/:id) in MilestoneDetail (DD-588).

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('DD-366 — RoadmapBoard navigiert statt Panel (DD-510 repoint)', () => {
  const roadmap = readSrc('src/views/RoadmapBoard.jsx')

  test('nutzt slug-aware Navigation (useProjectNav)', () => {
    expect(roadmap).toMatch(/useProjectNav/)
    expect(roadmap).toMatch(/from ['"]\.\.\/lib\/useProjectNav\.js['"]/)
  })

  test('navigiert zur Milestone-Detailseite via navigate(`/milestones/...`)', () => {
    expect(roadmap).toMatch(/navigate\(\s*`\/milestones\/\$\{[^}]+\}`\s*\)/)
    expect(roadmap).toMatch(/openMilestone/)
  })

  test('das deprecated MilestoneDetailPanel ist entfernt', () => {
    expect(roadmap).not.toMatch(/MilestoneDetailPanel/)
  })

  test('der selected-State (setSelected) ist entfernt', () => {
    expect(roadmap).not.toMatch(/setSelected/)
  })
})

describe('DD-366 — MilestoneDetail bindet den editierbaren DoD-Editor ein', () => {
  const detail = readSrc('src/views/MilestoneDetail.jsx')

  test('importiert MilestoneDodEditor (DD-588: kanonisches ui/-Organism)', () => {
    // DD-588 Cutover: Import zeigt auf ui/-Organism statt legacy-Pfad.
    expect(detail).toMatch(/import\s+MilestoneDodEditor\s+from\s+['"].*components\/ui\/organisms\/MilestoneDodEditor\.jsx['"]/)
  })

  test('rendert <MilestoneDodEditor .../>', () => {
    expect(detail).toMatch(/<MilestoneDodEditor/)
  })
})

describe('DD-366 — DoD-Editor-Endpoints in MilestoneDetail (DD-588: Container-Logik gehoben)', () => {
  // DD-588: Container-Logik (fetch) ist aus MilestoneDodEditor (jetzt presentational)
  // nach MilestoneDetail gehoben. Die Endpoints laufen weiterhin — nur der Ort ändert sich.
  const detail = readSrc('src/views/MilestoneDetail.jsx')

  test('POST auf .../dod-items (add) in MilestoneDetail vorhanden', () => {
    expect(detail).toMatch(/\/api\/milestones\/.*\/dod-items/)
    expect(detail).toMatch(/method:\s*['"]POST['"]/)
  })

  test('DELETE auf /api/dod-items/:id in MilestoneDetail vorhanden', () => {
    expect(detail).toMatch(/\/api\/dod-items\//)
    expect(detail).toMatch(/method:\s*['"]DELETE['"]/)
  })

  test('PATCH-Reorder auf .../dod-items/reorder in MilestoneDetail vorhanden (B01-fix)', () => {
    // B01: Reorder-Endpoint muss im Consumer verdrahtet sein — Organism ist
    // presentational (onReorder-Callback), der PATCH liegt hier.
    expect(detail).toMatch(/\/dod-items\/reorder/)
    expect(detail).toMatch(/method:\s*['"]PATCH['"]/)
    expect(detail).toMatch(/onReorder/)
  })
})
