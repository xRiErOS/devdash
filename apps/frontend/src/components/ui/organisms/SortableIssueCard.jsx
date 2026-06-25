/**
 * SortableIssueCard — kanonischer, token-sauberer DnD-Wrapper (DD-481 Extract aus
 * src/components/sprintBoard/primitives.jsx → `SortableIssueCard`).
 *
 * Domänen-bewusstes Organism: verdrahtet eine Issue-Karte (./IssueCard.jsx) mit
 * dnd-kit `useSortable`, damit sie innerhalb einer Sprint-Spalte sortierbar wird.
 * Der `in_progress`-Status sperrt das Ziehen (disabled-Guard) — Issues in Arbeit
 * sollen nicht versehentlich umgeordnet werden.
 *
 * Erhöhte Kopplung (D-Phase3-01): Das Organism bindet die externe Library
 * `@dnd-kit/sortable` (`useSortable`) + `@dnd-kit/utilities` (`CSS.Transform`).
 * Das ist UI-Verhalten (Drag-Transform), KEIN Daten-State — daher bleibt es im
 * Organism. Alle Issue-Daten kommen weiterhin als Props rein und werden 1:1 an
 * IssueCard durchgereicht; Mutationen laufen über die Callback-Props von IssueCard
 * (onSelect/onToggleMulti). Der `isDragging`-Zustand aus useSortable wird an die
 * IssueCard-Prop `isDragging` gehoben (visuelles Drag-Dimming via opacity-50 dort),
 * statt wie in der Quelle als zweiter inline-style — so bleibt nur EIN echter
 * runtime-dynamischer style (der DnD-Transform).
 *
 * @param {object} props
 * @param {object} props.item - Issue-Datensatz (siehe IssueCard); benötigt mind. { id, status }
 * @param {boolean} [props.selected=false] - Einzel-Selektion (an IssueCard durchgereicht)
 * @param {boolean} [props.multiSelected=false] - Multi-Selektion (an IssueCard durchgereicht)
 * @param {string} [props.highlightQuery=''] - Such-Query → Titel-Highlight in IssueCard
 * @param {(id:number)=>void} [props.onSelect] - Klick/Enter → Issue öffnen
 * @param {(id:number)=>void} [props.onToggleMulti] - Cmd/Ctrl+Klick → Multi-Toggle
 * @param {(id:number, next:string, notes?:string)=>void} [props.onStatusChange] - Outlier-Status-Mutation (an IssueCard)
 * @param {string} [props.dataUiScope='sortable-issue-card'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen am Sortable-Wrapper
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import IssueCard from './IssueCard.jsx'

export default function SortableIssueCard({
  item,
  selected = false,
  multiSelected = false,
  highlightQuery = '',
  onSelect,
  onToggleMulti,
  onStatusChange,
  dataUiScope = 'sortable-issue-card',
  className = '',
}) {
  // Issues in Arbeit dürfen nicht umgeordnet werden (Drag gesperrt).
  const isDisabled = item.status === 'in_progress'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.id),
    disabled: isDisabled,
  })

  // EINZIGER erlaubter dynamischer style: der DnD-Transform/Transition ist
  // zur Render-Zeit nicht als statische Klasse abbildbar (dnd-kit berechnet
  // ihn pro Frame aus der Pointer-Bewegung). Drag-Dimming läuft via der
  // IssueCard-Prop `isDragging` (opacity-50, token-clean), nicht hier.
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      data-ui={dataUiScope}
      className={className}
      // eslint-disable-next-line react/forbid-dom-props -- DnD-Transform: dnd-kit berechnet transform/transition pro Frame, nicht als statische Tailwind-Klasse abbildbar (maxInline=1).
      style={dragStyle}
      {...attributes}
      {...listeners}
    >
      <IssueCard
        item={item}
        isDragging={isDragging}
        selected={selected}
        multiSelected={multiSelected}
        highlightQuery={highlightQuery}
        onSelect={onSelect}
        onToggleMulti={onToggleMulti}
        onStatusChange={onStatusChange}
        dataUiScope={`${dataUiScope}.card`}
      />
    </div>
  )
}
