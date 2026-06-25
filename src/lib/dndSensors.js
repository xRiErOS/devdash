// dndSensors — DD-638 (F6): geteilte, touch-taugliche @dnd-kit-Sensor-Konfiguration.
//
// Problem (IST): die DnD-Flächen nutzten nur den PointerSensor. Auf Touch
// konkurriert ein distance-aktivierter PointerSensor mit dem Scroll → Drag ist
// unzuverlässig. Lösung: zusätzlich ein TouchSensor mit LONG-PRESS-Aktivierung
// (delay) — erst nach kurzem Halten startet der Drag, normales Scrollen bleibt
// frei. Plus KeyboardSensor als a11y-Fallback (Space/Enter aufnehmen, Pfeile
// bewegen, Esc abbrechen — Salesforce/Smashing-Pattern).
//
// Reuse: jede DnD-Fläche (RoadmapBoard, ProjectTodoList, künftig
// Next3SprintsCard/SprintOrderOverlay/BacklogPage) zieht dieselbe Konfiguration.
import {
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

// Long-press-Schwelle: 250 ms Halten aktiviert den Touch-Drag; bis dahin sind
// 5 px Bewegung toleriert (Wackeln am Finger), darüber gilt es als Scroll.
export const TOUCH_LONGPRESS = { delay: 250, tolerance: 5 }

/**
 * Touch-taugliche DnD-Sensoren (Pointer + Long-press-Touch + Keyboard).
 *
 * @param {object} [opts]
 * @param {number} [opts.pointerDistance=4] - Aktivierungsdistanz des PointerSensor (Desktop).
 * @param {Function} [opts.keyboardCoordinateGetter] - coordinateGetter für sortable Kontexte
 *   (z.B. sortableKeyboardCoordinates). Ohne ihn nutzt der KeyboardSensor seine Defaults
 *   (passend für nicht-sortable Droppable-Boards wie das Roadmap-Board).
 */
export function useTouchDndSensors({ pointerDistance = 4, keyboardCoordinateGetter } = {}) {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: pointerDistance } }),
    useSensor(TouchSensor, { activationConstraint: TOUCH_LONGPRESS }),
    useSensor(
      KeyboardSensor,
      keyboardCoordinateGetter ? { coordinateGetter: keyboardCoordinateGetter } : undefined,
    ),
  )
}
