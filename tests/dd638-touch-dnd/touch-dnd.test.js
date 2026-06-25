// DD-638 (F6) — Touch-taugliches Drag&Drop (Code-Build der passed SOLL-Story).
// Shared dnd-kit-Sensor-Factory: TouchSensor mit Long-press-Aktivierung (T01) +
// KeyboardSensor-a11y-Fallback (T04); DragOverlay-Ghost im Roadmap-Board (T02).
// Source-Guard (project_memory 333: env=node — @dnd-kit-Sensor-/DragOverlay-Laufzeit
// ist ohne echten Browser/Touch nicht testbar; visuelle Abnahme = PO/ADR).
// DEFER (eigenes Follow-up-Todo): T03 Auswahl-Overlay (Backlog→Sprint) +
// animierte Drop-Indicator-Linie (un-gate-testbare additive UI, Live-PO-Iteration).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

describe('DD-638 — Shared Touch-DnD-Sensor-Factory', () => {
  const f = read('src/lib/dndSensors.js')

  test('exportiert useTouchDndSensors', () => {
    expect(f).toMatch(/export function useTouchDndSensors/)
  })

  test('T01: TouchSensor mit Long-press-Aktivierung (delay + tolerance)', () => {
    expect(f).toContain('TouchSensor')
    expect(f).toMatch(/delay:\s*\d+/)
    expect(f).toMatch(/tolerance:\s*\d+/)
  })

  test('T04: KeyboardSensor (a11y-Fallback)', () => {
    expect(f).toContain('KeyboardSensor')
  })

  test('behält den PointerSensor (Desktop-Drag unverändert)', () => {
    expect(f).toContain('PointerSensor')
  })
})

describe('DD-638 — RoadmapBoard nutzt die Factory + Ghost + dnd.touch-Anker', () => {
  const view = read('src/views/RoadmapBoard.jsx')

  test('verdrahtet die Sensor-Factory statt eigenem PointerSensor-only', () => {
    expect(view).toContain('useTouchDndSensors')
  })

  test('T02: DragOverlay-Ghost', () => {
    expect(view).toContain('DragOverlay')
    expect(view).toContain('onDragStart')
  })

  test('emittiert das modellierte data_ui roadmap-board.dnd.touch im Live-DOM (W103)', () => {
    expect(view).toContain('.dnd.touch')
  })
})

describe('DD-638 — ProjectTodoList wird touch-tauglich (relevant_files)', () => {
  test('ProjectTodoList nutzt die geteilte Touch-DnD-Factory', () => {
    expect(read('src/components/ui/organisms/ProjectTodoList.jsx')).toContain('useTouchDndSensors')
  })
})
