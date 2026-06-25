import { X } from 'lucide-react'
import Button from '../atoms/Button.jsx'
import Badge from '../atoms/Badge.jsx'

/**
 * GF-247 — BulkActionBar (Organism, 05.20 Actions, OR-08). Kontextuelle Aktions-
 * leiste, die bei Mehrfachauswahl (`selectedCount > 0`) erscheint: Selektions-Count
 * + Clear-Selection + action-as-data-Buttons (assign/move/transition/delete).
 *
 * Ebene-6 (OR-08): CAP-issue-bulk-edit 🟡 partial (Status/Sprint/Tags),
 * CAP-tag-delete 🟡 partial — beide präsentational hier; die Mutation macht der
 * Consumer. `actions`-Array = dieselbe action-as-data-Struktur wie ListActionBar
 * (D10-F); die FAB ist nur die spätere Mobile-Präsentation desselben Sets (D09 deferred).
 *
 * Destruktive Aktion (`danger:true`, z.B. delete) → danger-Akzent (Button-Variante).
 *
 * @param {object} props
 * @param {number} [props.selectedCount=0] - Anzahl selektierter Items (>0 → sichtbar).
 * @param {()=>void} [props.onClearSelection]
 * @param {Array<{id:string,label:string,icon?:import('react').ReactNode,danger?:boolean,disabled?:boolean,onAction?:()=>void}>} [props.actions=[]]
 * @param {string} [props['data-ui']='organism.bulk-action-bar']
 * @param {string} [props.className]
 */
export default function BulkActionBar({
  selectedCount = 0,
  onClearSelection,
  actions = [],
  'data-ui': dataUi = 'organism.bulk-action-bar',
  className = '',
}) {
  if (selectedCount <= 0) return null

  // R2-BAB-1: destruktive Aktionen via Divider als gruppierte Sektion INNERHALB der
  // Leiste (kein detached Löschen am Rand). Reihenfolge: erst nicht-destruktiv, dann
  // Divider + destruktive Aktion(en).
  const safeActions = actions.filter((a) => !a.danger)
  const dangerActions = actions.filter((a) => a.danger)

  const renderAction = (a) => (
    <Button
      key={a.id}
      data-ui={`${dataUi}.action-${a.id}`}
      variant={a.danger ? 'danger' : 'secondary'}
      size="sm"
      leadingIcon={a.icon}
      disabled={a.disabled}
      onClick={a.onAction}
    >
      {a.label}
    </Button>
  )

  return (
    <div
      data-ui={dataUi}
      role="toolbar"
      aria-label="Bulk-Aktionen"
      className={`flex items-center gap-3 rounded-md border border-[var(--surface1)] bg-[var(--surface0)] px-3 py-2 ${className}`}
    >
      <span data-ui={`${dataUi}.count`} className="flex items-center gap-1.5 text-sm text-[var(--text)]">
        {/* R2-BAB-3: spezifischer Anker + breitenstabil (min-w + tabular-nums) → kein
            Layout-Shift bei 1- vs. 2-stelligem Count. */}
        <Badge
          tone="mauve"
          size="sm"
          data-ui={`${dataUi}.count-badge`}
          className="min-w-[1.5rem] justify-center font-bold tabular-nums"
        >
          {selectedCount}
        </Badge>
        ausgewählt
      </span>
      {/* R2-BAB-2: Clear mit führendem X-Icon → einheitliches Icon+Label-Muster /
          gleiche Größe wie die Aktions-Buttons. */}
      <Button
        data-ui={`${dataUi}.clear`}
        variant="secondary"
        size="sm"
        leadingIcon={<X size={14} aria-hidden="true" />}
        onClick={onClearSelection}
      >
        Auswahl aufheben
      </Button>
      <div className="ms-auto flex items-center gap-1">
        {safeActions.map(renderAction)}
        {dangerActions.length > 0 && (
          <>
            <span
              data-ui={`${dataUi}.divider`}
              aria-hidden="true"
              className="mx-1 h-5 w-px self-center bg-[var(--surface2)]"
            />
            {dangerActions.map(renderAction)}
          </>
        )}
      </div>
    </div>
  )
}
