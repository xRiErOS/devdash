import { useDroppable } from '@dnd-kit/core'

/**
 * DroppableColumn — kanonischer, token-sauberer @dnd-kit-Droppable-Wrapper
 * (DD-481 Extract aus sprintBoard/primitives.jsx, verlustfrei + entdomänisiert).
 *
 * Registriert sich via useDroppable als gültiges Drop-Target — auch leer.
 * Beim Hover eines Draggable (isOver) togglet ein Highlight (gestrichelter
 * Akzent-Outline + leichter Background-Tint + minimaler Scale-Lift).
 * Props-driven: kein Store, kein Fetch, keine Sprint/Issue-Domäne.
 *
 * @param {object} props
 * @param {string} props.id - generische Droppable-ID (vom Aufrufer vergeben)
 * @param {import('react').ReactNode} [props.children] - Spalten-Inhalt
 * @param {string} [props.className] - zusätzliche Klassen
 * @param {object} [props.style] - durchgereichte Inline-Styles (kein Literal)
 */

// Statische Highlight-Klassen, damit der Tailwind-JIT-Scanner sie literal sieht.
// Akzent = --accent-warning (entspricht dem ehemaligen --peach-Outline).
const OVER =
  'outline outline-2 outline-dashed outline-offset-[-2px] outline-[var(--accent-warning)] bg-[color-mix(in_srgb,var(--accent-warning)_8%,transparent)] scale-[1.005]'
const IDLE = 'outline-none scale-100'

export default function DroppableColumn({
  id,
  children,
  className = '',
  style,
  ...rest
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      data-ui="droppable-column"
      // eslint-disable-next-line react/forbid-dom-props -- Pass-through der vom Aufrufer gereichten Layout-Styles (kein Literal); Highlight läuft via Tailwind-Klassen
      style={style}
      className={`transition-[outline-color,background-color,transform] duration-150 ${isOver ? OVER : IDLE} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
