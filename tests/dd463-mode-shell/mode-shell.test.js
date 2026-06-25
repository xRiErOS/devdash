// DD-510 (DD#62): Der 3-Modi-Mode-Shell (SEG_TO_MODE/MODE_TO_SEG/SegmentedControl,
// SprintBoardMode/SwimlaneMode/TimelineMode-Module, DnD-Pass-Through) ist ENTFERNT.
// Das Spalten-Board ist die EINE Ansicht — kein Modus-Switch, keine Mode-Module.
//
// DD-510 removal: die STRUCK Asserts dieser Charakterisierungs-Suite sind gelöscht —
//   T01/T01b/T01c (SEG_TO_MODE-Mapping), T03c (SegmentedControl-Modus-Switch),
//   T04/T04b/T04c (SprintBoardMode-Modul), T05/T05b/T05c (Swimlane-/Timeline-Modul-
//   Platzhalter). Sie hingen an Architektur, die der Cutover ersetzt.
//
// STILL-VALID (behalten, repointet): Nav-Kollaps (T02*), Archetyp BoardPage (T03/T03b),
// AppShell-Mounts (T06*), genau EIN DndContext (T07), genau EIN Daten-Fetch (T08).
import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd())
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// ─── T02: Nav-Kollaps ─────────────────────────────────────────────────────────
// DD-585: IconSidebar.jsx → _archive/ (Container-Logik nach Layout.jsx). Tests
// prüfen jetzt Layout.jsx (sidebarItems + sidebarActiveKey-Logik).
test('T02: Layout sidebarItems hat genau EINEN Roadmap-/Board-Eintrag statt zwei', () => {
  const code = src('src/components/ui/layout/Layout.jsx')

  // Alt: separate Milestones + Sprint-Board-Einträge NICHT mehr vorhanden
  expect(code).not.toContain("label: 'Milestones'")   // kein separates Milestones-Label
  expect(code).not.toContain('label: "Milestones"')

  // Neu: genau ein Eintrag mit label "Roadmap" in sidebarItems. DD-534 (F1 Slice A)
  // führte ein separates bottomTabItems-Array mit eigenem Roadmap-Tab ein → die
  // Invariante gilt scope-lokal für sidebarItems, daher den Array-Block isolieren.
  const sidebarBlock = code.slice(
    code.indexOf('const sidebarItems = ['),
    code.indexOf('const sidebarFooterItems = ['),
  )
  const roadmapMatches = (sidebarBlock.match(/label:\s*['"]Roadmap['"]/g) || []).length
  expect(roadmapMatches, 'genau 1 Roadmap-sidebarItems-Eintrag erwartet').toBe(1)
})

test('T02b: Layout sidebarActiveKey deckt board/milestones/roadmap/review für roadmap-Schlüssel ab', () => {
  const code = src('src/components/ui/layout/Layout.jsx')
  // Alle Board-Segmente müssen in der activeKey-Logik vorkommen
  expect(code).toContain("viewSeg === 'board'")
  expect(code).toContain("viewSeg === 'milestones'")
  expect(code).toContain("viewSeg === 'roadmap'")
  expect(code).toContain("'roadmap'")
})

// ─── T03: Archetyp — RoadmapBoard verwendet BoardPage ─────────────────────────
test('T03: RoadmapBoard importiert BoardPage', () => {
  const code = src('src/views/RoadmapBoard.jsx')
  expect(code).toContain("import BoardPage from")
  expect(code).toContain('BoardPage')
})

test('T03b: RoadmapBoard rendert <BoardPage + befüllt toolbar/lanes (DD-510: lanes inline)', () => {
  const code = src('src/views/RoadmapBoard.jsx')
  // Der abschließende return muss BoardPage als Element haben
  expect(code).toContain('<BoardPage')
  // toolbar-Slot bleibt; lanes wird im Spalten-Board als JSX-Literal (nicht Variable) befüllt.
  expect(code).toContain('toolbar={toolbar}')
  expect(code).toContain('lanes={')
})

// ─── T06: AppShell — alle 3 Routen mounten RoadmapBoard ─────────────────────
test('T06: AppShell hat Route board → RoadmapBoard', () => {
  const code = src('src/views/AppShell.jsx')
  expect(code).toContain('path="board"')
  expect(code).toContain('path="milestones"')
  expect(code).toContain('path="roadmap"')
})

test('T06b: AppShell milestones-Route zeigt RoadmapBoard (nicht MilestoneView)', () => {
  const code = src('src/views/AppShell.jsx')
  // Alle drei Board-Routen dürfen nicht MilestoneView oder MilestoneRoadmapV2 als element haben
  // Wir prüfen: Die milestones-Route hat RoadmapBoard als element
  // Einfacher Heuristik-Check: die Route-Zeile mit milestones enthält RoadmapBoard
  const lines = code.split('\n')
  const milestonesRoutes = lines.filter(l => l.includes('path="milestones"') && !l.includes(':id'))
  expect(milestonesRoutes.length, 'genau eine milestones-Route (ohne :id)').toBe(1)
  expect(milestonesRoutes[0]).toContain('RoadmapBoard')
})

test('T06c: AppShell roadmap-Route zeigt RoadmapBoard (nicht MilestoneRoadmapV2)', () => {
  const code = src('src/views/AppShell.jsx')
  const lines = code.split('\n')
  const roadmapRoutes = lines.filter(l => l.includes('path="roadmap"'))
  expect(roadmapRoutes.length, 'genau eine roadmap-Route').toBe(1)
  expect(roadmapRoutes[0]).toContain('RoadmapBoard')
})

// ─── T07: DnD-Context ist im Container ────────────────────────────────────────
// DD-510: Der Container hält genau EINEN DndContext mit einem einzelnen onDragEnd
// (Spalten-Reorder + Card-Move) — kein onDragStart/Mode-Pass-Through mehr.
test('T07: RoadmapBoard-Container hält genau einen DndContext mit onDragEnd', () => {
  const code = src('src/views/RoadmapBoard.jsx')
  expect(code).toContain('DndContext')
  expect((code.match(/<DndContext/g) || []).length).toBe(1)
  expect(code).toContain('onDragEnd={handleDragEnd}')
})

// ─── T08: 1× Daten-Fetch-Pfad im Container ───────────────────────────────────
// DD-510: Der Container lädt Milestones/Sprints/Issues in genau EINER load()-
// useCallback (kein per-Modus-Fetch). Wir pinnen die zentrale load-Definition.
test('T08: RoadmapBoard hat genau einen zentralen load()-Daten-Fetch', () => {
  const code = src('src/views/RoadmapBoard.jsx')
  const loadCount = (code.match(/const load = useCallback/g) || []).length
  expect(loadCount, 'genau 1 zentraler load()-Fetch im Container').toBe(1)
})
