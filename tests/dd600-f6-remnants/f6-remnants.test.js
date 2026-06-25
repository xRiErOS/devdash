// DD-600 / todo #166 (F6-Reste) — Auswahl-Overlay (Tap-statt-Drag) + animierte
// Drop-Indicator-Linie + FAB-Exit. Code-Build der passed SOLL-Story
// (RoadmapBoard.stories.jsx: MobileAssignOverlay / MobileTouchDragActive).
//
// Source-Guard (project_memory 333: env=node — @dnd-kit-Touch-/DragOverlay-Laufzeit
// + CSS-Gating sind ohne echten Browser/Touch nicht testbar; visuelle/Touch-Abnahme
// = PO, DD-186). Hier wird die Verdrahtung der modellierten data_ui-Anker im
// Live-DOM (W103) + die Funktions-Pfade per Source belegt.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const view = read('src/views/RoadmapBoard.jsx')

describe('DD-600 — F6 Drop-Indicator-Linie', () => {
  test('emittiert den SOLL-Anker roadmap-board.dnd.drop-indicator', () => {
    expect(view).toContain('.dnd.drop-indicator')
  })

  test('Indicator hängt am aktuellen Drop-Ziel (overId via onDragOver)', () => {
    expect(view).toContain('onDragOver')
    expect(view).toMatch(/setOverId/)
    expect(view).toMatch(/isDropTarget/)
  })
})

describe('DD-600 — F6 Auswahl-Overlay (Tap statt Drag)', () => {
  test('emittiert den SOLL-Anker roadmap-board.dnd.assign-overlay + Zeilen-Anker', () => {
    expect(view).toContain('.dnd.assign-overlay')
    expect(view).toContain('.dnd.assign.')
    expect(view).toContain('.dnd.assign-trigger.')
  })

  test('Tap-Zuordnung nutzt computeCardMove + PUT /api/sprints/:id (kein neuer Endpoint)', () => {
    expect(view).toContain('assignSprintToMilestone')
    expect(view).toContain('computeCardMove')
    expect(view).toMatch(/method:\s*'PUT'/)
  })

  test('Overlay ist mobil-gegatet (md:hidden) — Desktop nutzt Drag', () => {
    expect(view).toMatch(/dnd\.assign-overlay[^]*?md:hidden|md:hidden[^]*?dnd\.assign-overlay/)
  })
})

describe('DD-600 — F6 FAB-Exit (Drag-Modus verlassen)', () => {
  test('emittiert den SOLL-Anker roadmap-board.dnd.exit, nur bei aktivem Card-Drag', () => {
    expect(view).toContain('.dnd.exit')
    expect(view).toMatch(/activeDrag\?\.kind === 'card'/)
  })
})
