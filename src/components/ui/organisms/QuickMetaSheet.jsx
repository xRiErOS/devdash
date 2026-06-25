import Stack from '../layout/Stack.jsx'
import Cluster from '../layout/Cluster.jsx'
import Pill from '../atoms/Pill.jsx'
import Button from '../atoms/Button.jsx'

/**
 * QuickMetaSheet — halbhohes Bottom-Sheet für die Quick-Meta-Edits Sprint und
 * Priorität (DD-635 / F3, DD-604). Kein Vollbild — kurze Felder werden hier
 * bedient, lange Felder über den dedizierten Edit-Screen (DetailEditScreen).
 * Grabber oben, Optionsreihen mit ≥44px-Touch-Targets, Übernehmen/Abbrechen unten.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.sprintLabel - Anzeige des aktuell zugewiesenen Sprints
 * @param {Array<{value:string|number,label:string}>} [props.sprintOptions]
 * @param {string|number} [props.sprintValue] - aktuell gewählter Sprint-Wert
 * @param {(value:string)=>void} [props.onSelectSprint]
 * @param {number} [props.priority] - aktuelle Priorität (1..5)
 * @param {number[]} [props.priorities] - wählbare Prioritäten
 * @param {(value:number)=>void} [props.onSelectPriority]
 * @param {()=>void} [props.onApply]
 * @param {()=>void} [props.onCancel]
 */
export default function QuickMetaSheet({
  open,
  sprintLabel,
  sprintOptions = [],
  sprintValue = '',
  onSelectSprint,
  priority,
  priorities = [1, 2, 3, 4, 5],
  onSelectPriority,
  onApply,
  onCancel,
}) {
  if (!open) return null
  return (
    <>
      <div
        aria-hidden
        data-ui="app-shell.detail.quick-meta.scrim"
        className="absolute inset-0 z-30 bg-[color-mix(in_srgb,var(--crust)_55%,transparent)]"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-label="Quick-Meta bearbeiten"
        data-ui="app-shell.detail.quick-meta.sheet"
        className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-[var(--surface1)] bg-[var(--base)]"
      >
        <Stack gap="sm" className="px-4 pt-4 pb-safe-bar">
          <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-[var(--surface2)]" />
          <h2 className="font-display text-sm font-bold text-[var(--text)]">Schnell bearbeiten</h2>

          <Stack gap="xs">
            <Cluster gap="sm" justify="between" className="flex-nowrap min-h-[44px]">
              <span className="text-sm text-[var(--subtext0)]">Sprint</span>
              <Pill variant="filled" color="primary" size="md">{sprintLabel || 'Kein Sprint'}</Pill>
            </Cluster>
            {sprintOptions.length > 0 && (
              <select
                value={sprintValue ?? ''}
                onChange={(e) => onSelectSprint?.(e.target.value)}
                aria-label="Sprint zuweisen"
                data-ui="app-shell.detail.quick-meta.sprint"
                className="rounded-lg border-0 outline-none bg-[var(--surface0)] text-[var(--text)] text-[16px] min-h-[44px] px-3"
              >
                {sprintOptions.map((o) => (
                  <option key={String(o.value)} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </Stack>

          <Cluster gap="sm" justify="between" className="flex-nowrap min-h-[44px]">
            <span className="text-sm text-[var(--subtext0)]">Priorität</span>
            <Cluster gap="xs" className="flex-nowrap">
              {priorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onSelectPriority?.(p)}
                  aria-pressed={p === priority}
                  data-ui={`app-shell.detail.quick-meta.priority.${p}`}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                >
                  <Pill variant={p === priority ? 'filled' : 'outline'} color={p === priority ? 'warning' : 'neutral'} size="md">
                    P{p}
                  </Pill>
                </button>
              ))}
            </Cluster>
          </Cluster>

          <Cluster gap="sm" justify="end" className="flex-nowrap">
            <Button variant="ghost" size="lg" onClick={onCancel}>Abbrechen</Button>
            <Button variant="primary" size="lg" onClick={onApply}>Übernehmen</Button>
          </Cluster>
        </Stack>
      </div>
    </>
  )
}
