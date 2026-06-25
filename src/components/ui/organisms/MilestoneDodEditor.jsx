/**
 * MilestoneDodEditor — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/MilestoneDodEditor.jsx, DD-366).
 *
 * Domänen-bewusste Einheit (Domäne: Milestone): editierbare Definition-of-Done-
 * Kriterienliste eines Milestones — Checkbox-Toggle pro Kriterium, Add-Form,
 * Remove pro Zeile, Reorder-Handle. Komponiert die Atoms Input, Button und Pill.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle lud/mutierte direkt via fetch:
 *      add    → POST   /api/milestones/:id/dod-items   { label }
 *      toggle → PATCH  /api/dod-items/:id              { done }
 *      delete → DELETE /api/dod-items/:id
 *      reorder→ PATCH  /api/milestones/:id/dod-items/reorder { order }
 *    Alle Mutationen sind hier zu Callback-Props gehoben — `onToggle(item)`,
 *    `onAdd(label)`, `onRemove(item)`, `onReorder(orderedIds)`. Der Konsument
 *    führt die API-Calls + den `confirm()`-Guard aus und reicht die neue
 *    `criteria`-Liste zurück (kein lokaler Daten-State / kein optimistic copy).
 *  - Die @dnd-kit-Drag-Reorder-Mechanik der Quelle ist entfernt (maxInline=0 →
 *    kein runtime-dynamischer transform-style). Reorder bleibt als Affordance:
 *    Up/Down-Trigger feuern `onReorder` mit der neuen ID-Reihenfolge; das
 *    visuelle Sortieren obliegt dem Konsumenten via aktualisierter `criteria`.
 *  - Das Roh-Hex der Quelle (Dark-Text-on-Bright-Status-Fill am Add-Button) →
 *    durch das Button-Atom (variant="primary", text-[var(--on-accent)]) ersetzt.
 *
 * Ephemerer UI-State: `draft` (useState) für das Add-Input — bleibt lokal.
 *
 * @param {object} props
 * @param {Array<{id:number,label:string,done:number}>} [props.criteria=[]] - DoD-Kriterien (done: 1|0)
 * @param {string} [props.heading='Definition of Done'] - Sektions-Überschrift
 * @param {string} [props.placeholder='Neues DoD-Item…'] - Add-Input-Placeholder
 * @param {boolean} [props.reorderable=true] - Up/Down-Reorder-Buttons anzeigen;
 *        feuert `onReorder` mit der neuen ID-Reihenfolge. Der Konsument führt
 *        den API-Call aus und reicht die aktualisierte `criteria`-Liste zurück.
 * @param {(item:object)=>void} [props.onToggle] - Checkbox-Toggle (done flippen)
 * @param {(label:string)=>void} [props.onAdd] - neues Kriterium anlegen
 * @param {(item:object)=>void} [props.onRemove] - Kriterium entfernen
 * @param {(orderedIds:number[])=>void} [props.onReorder] - neue ID-Reihenfolge (gehoben)
 * @param {string} [props.dataUiScope='milestone-dod-editor'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { X, ChevronUp, ChevronDown } from 'lucide-react'
import Pill from '../atoms/Pill.jsx'
import ChecklistInputForm from './ChecklistInputForm.jsx'

export default function MilestoneDodEditor({
  criteria = [],
  heading = 'Definition of Done',
  showHeader = true,
  placeholder = 'Neues DoD-Item…',
  reorderable = true,
  onToggle,
  onAdd,
  onRemove,
  onReorder,
  dataUiScope = 'milestone-dod-editor',
  className = '',
}) {
  const doneCount = criteria.filter((c) => c.done === 1).length

  // Reorder helper: bewegt Item an Position idx um delta (-1=up, +1=down)
  // und feuert onReorder mit der neuen ID-Reihenfolge.
  const move = (idx, delta) => {
    const next = [...criteria]
    const target = idx + delta
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onReorder?.(next.map((c) => c.id))
  }

  return (
    <div data-ui={dataUiScope} className={`flex flex-col gap-2 ${className}`}>
      {showHeader && (
        <div data-ui={`${dataUiScope}.header`} className="flex items-center gap-2">
          <h3 data-ui={`${dataUiScope}.heading`} className="text-sm font-medium text-[var(--text)]">
            {heading}
          </h3>
          {criteria.length > 0 && (
            <Pill
              variant="outline"
              color={doneCount === criteria.length ? 'success' : 'info'}
              size="sm"
              data-ui={`${dataUiScope}.progress`}
            >
              {doneCount}/{criteria.length}
            </Pill>
          )}
        </div>
      )}

      <ul data-ui={`${dataUiScope}.list`} className="flex flex-col gap-1 list-none p-0 m-0">
        {criteria.map((item, idx) => (
          <li
            key={item.id}
            data-ui={`${dataUiScope}.item`}
            data-testid={`dod-item-${item.id}`}
            className="flex items-center gap-2 px-1.5 py-1.5 min-h-11 rounded bg-[var(--base)]"
          >
            {reorderable && (
              <span
                data-ui={`${dataUiScope}.item.reorder`}
                className="flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  data-ui={`${dataUiScope}.item.move-up`}
                  aria-label="Nach oben"
                  className="flex items-center justify-center w-5 h-5 rounded text-[var(--subtext0)] hover:text-[var(--text)] hover:bg-[var(--surface1)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === criteria.length - 1}
                  data-ui={`${dataUiScope}.item.move-down`}
                  aria-label="Nach unten"
                  className="flex items-center justify-center w-5 h-5 rounded text-[var(--subtext0)] hover:text-[var(--text)] hover:bg-[var(--surface1)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronDown size={12} />
                </button>
              </span>
            )}
            <input
              type="checkbox"
              checked={item.done === 1}
              onChange={() => onToggle?.(item)}
              data-testid={`dod-checkbox-${item.id}`}
              data-ui={`${dataUiScope}.item.toggle`}
              data-checked={item.done === 1 ? 'true' : 'false'}
              className="relative w-5 h-5 shrink-0 cursor-pointer appearance-none rounded border border-[var(--overlay0)] bg-[var(--surface2)] transition-colors checked:border-[var(--accent-primary)] checked:bg-[var(--accent-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent-primary)] after:absolute after:left-1/2 after:top-[45%] after:hidden after:h-2.5 after:w-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-b-2 after:border-r-2 after:border-[var(--on-accent)] after:content-[''] checked:after:block"
            />
            <span
              data-testid={`dod-label-${item.id}`}
              data-ui={`${dataUiScope}.item.label`}
              className={`flex-1 min-w-0 text-[13px] ${item.done === 1 ? 'line-through text-[var(--subtext0)]' : 'text-[var(--text)]'}`}
            >
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => onRemove?.(item)}
              data-testid={`dod-delete-${item.id}`}
              data-ui={`${dataUiScope}.item.remove`}
              aria-label="DoD-Item löschen"
              className="flex items-center justify-center min-h-11 min-w-11 rounded bg-transparent text-[var(--accent-danger)] hover:bg-[var(--surface1)] cursor-pointer"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>

      <ChecklistInputForm
        variant="dod"
        onCreate={(label) => onAdd?.(label)}
        placeholder={placeholder}
        dataUiScope={`${dataUiScope}.add`}
        inputTestId="dod-add-input"
        submitTestId="dod-add-button"
      />
    </div>
  )
}
