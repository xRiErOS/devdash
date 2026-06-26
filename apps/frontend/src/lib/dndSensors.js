/**
 * dndSensors — gebündelte @dnd-kit-Sensoren für das RoadmapBoard.
 *
 * Desktop-first (DD2): Pointer (Maus/Stift) + Keyboard. Kein Mobile-Long-Press —
 * später additiv erweiterbar (TouchSensor mit activation delay), darum der
 * `useTouch…`-Name als bewusster Platzhalter für die kommende Touch-Achse.
 *
 * PointerSensor mit kleiner Aktivierungs-Distanz, damit ein Klick auf die Card
 * (Navigation) nicht versehentlich als Drag startet — nur der DragHandle zieht.
 */
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

export function useTouchDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}
