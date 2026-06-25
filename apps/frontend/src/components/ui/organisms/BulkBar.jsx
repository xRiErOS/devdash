/**
 * BulkBar — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/BulkBar.jsx, DD-36/DD-113/DD-157/DD-174).
 *
 * Domänen-bewusste Einheit: Floating-Action-Leiste für Bulk-Operationen auf
 * mehrfach selektierten Issues (Sprint zuweisen/entfernen, Status setzen,
 * Projekt-Move, Papierkorb). Komponiert das Button-Atom (Action-
 * Trigger via inline BulkActionButton-Komposition) und das PopoverPanel-Atom
 * (Dropdown-Optik). Ephemerer UI-State: `openMenu` (welches Dropdown offen ist).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle rief `fetch('/api/backlog/bulk' | '/api/backlog/:id/move')` direkt
 *    + `getActiveProjectId()` aus dem projectStore. Alle Mutationen sind hier zu
 *    einem generischen `onAction(action, payload)`-Callback gehoben (action ∈
 *    set_sprint | set_status | move | soft_delete). Der Konsument führt die
 *    API-Calls aus und meldet das Ergebnis selbst.
 *  - `selectedIds`/`sprints` waren teils via Store/Fetch beschafft → jetzt reine
 *    Props (`selectedCount`, `availableActions`). Die Move-Projektliste
 *    (vorher `fetch('/api/projects')`) kommt als `availableActions.projects`.
 *  - `busy`-State (vorher lokal um async-fetch) ist als `busy`-Prop gehoben
 *    (der Konsument kennt den Mutations-In-Flight-Zustand).
 *  - Esc-Handler (Auswahl aufheben) bleibt als ephemerer Keyboard-Handler lokal.
 *  - `confirm()`-Guards (destruktiv) entfallen — Confirmation ist Sache des
 *    Konsumenten im jeweiligen Callback.
 *
 * @param {object} props
 * @param {number} props.selectedCount - Anzahl selektierter Issues (Counter-Anzeige)
 * @param {object} [props.availableActions] - was angeboten wird:
 *        { sprints?: [{id,status,...}], statuses?: [{value,label}],
 *          projects?: [{id,name,prefix}], trash?: boolean }
 * @param {boolean} [props.busy=false] - Mutation in-flight → Trigger disabled
 * @param {(action:string, payload?:object)=>void} [props.onAction] - Bulk-Mutation
 *        (action: 'set_sprint'|'set_status'|'move'|'soft_delete')
 * @param {()=>void} [props.onClear] - Auswahl aufheben (X / Esc)
 * @param {(sprint:object)=>string} [props.sprintLabel] - Formatter für Sprint-Optionen
 * @param {string} [props.dataUiScope='bulk-bar'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState, useEffect } from 'react'
import { X, Trash2, ChevronDown, ArrowRight } from 'lucide-react'
import Button from '../atoms/Button.jsx'
import PopoverPanel from '../atoms/PopoverPanel.jsx'

const DEFAULT_STATUSES = [
  { value: 'refined', label: 'Refined' },
  { value: 'planned', label: 'Geplant' },
  { value: 'cancelled', label: 'Storniert' },
]

// Menü-Eintrag im Dropdown — token-cleane, full-width Zeile (Ersatz für die
// inline-style-Buttons der Quelle).
function MenuItem({ children, onClick, dataUi }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ui={dataUi}
      className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface0)]"
    >
      {children}
    </button>
  )
}

export default function BulkBar({
  selectedCount = 0,
  availableActions = {},
  busy = false,
  onAction,
  onClear,
  sprintLabel = (s) => s?.name ?? `Sprint ${s?.id}`,
  dataUiScope = 'bulk-bar',
  className = '',
}) {
  // Ephemerer UI-State: welches Dropdown offen ist ('sprint'|'status'|'move'|null).
  const [openMenu, setOpenMenu] = useState(null)

  // Esc → Auswahl aufheben (zustandsloser Keyboard-Handler, bleibt lokal).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenMenu(null)
        onClear?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClear])

  const sprints = availableActions.sprints || []
  const statuses = availableActions.statuses || DEFAULT_STATUSES
  const projects = availableActions.projects || []
  const showTrash = availableActions.trash !== false

  const fire = (action, payload) => {
    setOpenMenu(null)
    onAction?.(action, payload)
  }

  const toggle = (menu) => setOpenMenu((m) => (m === menu ? null : menu))

  const assignableSprints = sprints.filter((s) => s.status === 'planning' || s.status === 'active')

  return (
    <div
      data-ui={dataUiScope}
      role="toolbar"
      aria-label="Bulk-Aktionen"
      className={`fixed bottom-safe left-1/2 -translate-x-1/2 z-50 flex flex-col rounded-xl shadow-2xl max-w-[calc(100vw-2rem)] bg-[var(--surface0)] border border-[var(--surface1)] ${className}`}
    >
      {/* Header: Counter links, X rechts — bleibt IMMER eine Zeile (DD-174). */}
      <div data-ui={`${dataUiScope}.header`} className="flex items-center gap-2 px-3 pt-2 pb-1.5">
        <span
          data-ui={`${dataUiScope}.count`}
          className="text-sm font-mono whitespace-nowrap shrink-0 text-[var(--text)]"
        >
          {selectedCount} ausgewählt
        </span>
        <div className="flex-1" aria-hidden />
        <button
          type="button"
          onClick={onClear}
          aria-label="Auswahl aufheben (Esc)"
          data-ui={`${dataUiScope}.clear`}
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 text-[var(--subtext0)] hover:bg-[var(--surface1)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="h-px mx-3 shrink-0 bg-[var(--surface1)]" aria-hidden />

      {/* Action-Zone: kontrollierter Umbruch (>=1 Zeile je nach Viewport). */}
      <div data-ui={`${dataUiScope}.actions`} className="flex flex-wrap items-center gap-2 px-3 pt-2 pb-2">

        {/* Sprint */}
        <div className="relative">
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={() => toggle('sprint')}
            trailingIcon={<ChevronDown size={14} />}
            data-ui={`${dataUiScope}.sprint.trigger`}
          >
            Sprint
          </Button>
          {openMenu === 'sprint' && (
            <PopoverPanel
              align="left"
              data-ui={`${dataUiScope}.sprint.menu`}
              className="bottom-full mb-1 mt-0 w-56 max-h-72 overflow-y-auto"
            >
              <MenuItem onClick={() => fire('set_sprint', { sprint_id: null })} dataUi={`${dataUiScope}.sprint.item`}>
                Backlog
              </MenuItem>
              {assignableSprints.map((s) => (
                <MenuItem
                  key={s.id}
                  onClick={() => fire('set_sprint', { sprint_id: s.id })}
                  dataUi={`${dataUiScope}.sprint.item`}
                >
                  {sprintLabel(s)}
                </MenuItem>
              ))}
            </PopoverPanel>
          )}
        </div>

        {/* Status */}
        <div className="relative">
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={() => toggle('status')}
            trailingIcon={<ChevronDown size={14} />}
            data-ui={`${dataUiScope}.status.trigger`}
          >
            Status
          </Button>
          {openMenu === 'status' && (
            <PopoverPanel
              align="left"
              data-ui={`${dataUiScope}.status.menu`}
              className="bottom-full mb-1 mt-0 w-44"
            >
              {statuses.map((s) => (
                <MenuItem
                  key={s.value}
                  onClick={() => fire('set_status', { status: s.value })}
                  dataUi={`${dataUiScope}.status.item`}
                >
                  {s.label}
                </MenuItem>
              ))}
            </PopoverPanel>
          )}
        </div>

        {/* In anderes Projekt verschieben (DD-113) */}
        {projects.length > 0 && (
          <div className="relative">
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => toggle('move')}
              title="In anderes Projekt verschieben"
              leadingIcon={<ArrowRight size={14} />}
              trailingIcon={<ChevronDown size={14} />}
              data-ui={`${dataUiScope}.move.trigger`}
            >
              Projekt
            </Button>
            {openMenu === 'move' && (
              <PopoverPanel
                align="left"
                data-ui={`${dataUiScope}.move.menu`}
                className="bottom-full mb-1 mt-0 w-56 max-h-72 overflow-y-auto"
              >
                {projects.map((p) => (
                  <MenuItem
                    key={p.id}
                    onClick={() => fire('move', { target_project_id: p.id })}
                    dataUi={`${dataUiScope}.move.item`}
                  >
                    <span className="font-mono text-[11px] text-[var(--subtext1)]">{p.prefix}</span>
                    <span className="flex-1 min-w-0 truncate">{p.name}</span>
                  </MenuItem>
                ))}
              </PopoverPanel>
            )}
          </div>
        )}

        {/* Papierkorb */}
        {showTrash && (
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={() => fire('soft_delete', {})}
            title="In Papierkorb verschieben"
            leadingIcon={<Trash2 size={14} className="text-[var(--accent-danger)]" />}
            data-ui={`${dataUiScope}.trash`}
          >
            Papierkorb
          </Button>
        )}
      </div>
    </div>
  )
}
