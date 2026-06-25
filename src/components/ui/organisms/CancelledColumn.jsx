/**
 * CancelledColumn — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/sprintBoard/CancelledColumn.jsx).
 *
 * Domänen-bewusste Einheit: einklappbare „Storniert"-Sektion für gecancelte
 * Issues eines Sprint-Boards. Komponiert das Organism `IssueCard` zu einer Liste.
 * `variant` steuert nur das Outer-Layout:
 *  - 'column' → flache Sprint-Row: eigene 22rem-Spalte (flex-shrink-0).
 *  - 'row'    → Swimlane-Modus: volle Breite unterhalb der Buckets (mt-4).
 * Rendert null, solange keine stornierten Items vorliegen.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API. Gehobene Kopplung
 * gegenüber der Quelle:
 *  - Die Quelle delegierte den Collapse-Zustand vollständig an die Eltern
 *    (`show`/`onToggle` Pflicht-Props). Hier ist der Collapse zu ephemerem
 *    UI-State (`useState`) gehoben und intern verwaltet; `show`/`onToggle`
 *    bleiben als OPTIONALE controlled-Overrides erhalten (Eltern dürfen den
 *    Toggle weiterhin steuern, müssen aber nicht).
 *  - Daten (`items`, `selectedIds`) kommen als Props; Mutationen/Selektionen
 *    laufen über die Callback-Props `onSelect` / `onToggleMulti`.
 *
 * Ephemerer UI-State: `open` (Collapse-Toggle, useState).
 *
 * @param {object} props
 * @param {Array<object>} [props.items=[]] - stornierte Issue-Datensätze für IssueCard
 * @param {boolean} [props.show] - controlled Collapse-Override (wenn gesetzt, gewinnt es über internen State)
 * @param {() => void} [props.onToggle] - controlled Toggle-Callback (Eltern-gesteuert)
 * @param {boolean} [props.defaultOpen=false] - initialer Collapse-Zustand (uncontrolled)
 * @param {(id:number)=>void} [props.onSelect] - Issue öffnen
 * @param {(id:number)=>void} [props.onToggleMulti] - Multi-Selektion togglen
 * @param {Set<number>} [props.selectedIds] - aktuell multi-selektierte Issue-IDs
 * @param {'column'|'row'} [props.variant='column'] - Outer-Layout-Variante
 * @param {string} [props.dataUiScope='cancelled-column'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState } from 'react'
import IssueCard from './IssueCard.jsx'

// variant → statische Outer-Layout-Klasse (JIT-sichtbar, kein String-Interpolation).
const VARIANT_CLASS = {
  column: 'flex-shrink-0 w-[22rem] rounded-xl p-4',
  row: 'mt-4 rounded-xl p-4',
}

export default function CancelledColumn({
  items = [],
  show,
  onToggle,
  defaultOpen = false,
  onSelect,
  onToggleMulti,
  selectedIds,
  variant = 'column',
  dataUiScope = 'cancelled-column',
  className = '',
}) {
  // Ephemerer Collapse-State (uncontrolled); `show` überschreibt ihn falls gesetzt.
  const [open, setOpen] = useState(defaultOpen)
  const isControlled = typeof show === 'boolean'
  const expanded = isControlled ? show : open

  const handleToggle = () => {
    if (onToggle) onToggle()
    if (!isControlled) setOpen((v) => !v)
  }

  if (!items || items.length === 0) return null

  const ids = selectedIds || new Set()
  const outerClass = VARIANT_CLASS[variant] || VARIANT_CLASS.column

  return (
    <div
      data-ui={dataUiScope}
      className={`bg-[var(--mantle)] opacity-75 ${outerClass} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 data-ui={`${dataUiScope}.title`} className="font-bold text-sm text-[var(--subtext0)]">
          Storniert ({items.length})
        </h3>
        <button
          type="button"
          onClick={handleToggle}
          data-ui={`${dataUiScope}.toggle`}
          className="text-xs px-2 py-1 rounded min-h-[28px] bg-[var(--surface1)] text-[var(--subtext0)]"
        >
          {expanded ? 'Einklappen' : 'Anzeigen'}
        </button>
      </div>
      {expanded &&
        items.map((item) => (
          <IssueCard
            key={item.id}
            item={item}
            onSelect={onSelect}
            onToggleMulti={onToggleMulti}
            multiSelected={ids.has(item.id)}
            dataUiScope={`${dataUiScope}.card`}
          />
        ))}
    </div>
  )
}
