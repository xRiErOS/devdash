import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import StatusBadge from '../atoms/StatusBadge.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-286 — StatusBadgeSelect (Organism, 05.20 Actions, Q01). Vereint das
 * StatusBadge-Atom (Anzeige) und ein Auswahl-Menü zu EINER interaktiven Funktion:
 * der aktuelle Status ist das klickbare Trigger-Badge; ein Klick öffnet ein Menü
 * NUR der erlaubten Übergänge (`allowedStatuses` — der Consumer liefert die
 * Lifecycle-validen Ziele). Auswahl → `onChange(status)`.
 *
 * Ersetzt in EntityItem das redundante Paar StatusBadge + StatusPillSelect (EI-6).
 * GF-231 StatusPillSelect (stable, native Select) bleibt für reine Form-Kontexte.
 *
 * Stateful (offen/zu); präsentational bzgl. Daten (Mutation/Transition-Validierung
 * beim Consumer). Komponiert nur Atome (StatusBadge/Button) — kein rohes
 * button/input/select (Tier-Lint).
 *
 * @param {object} props
 * @param {string} props.status - aktueller Status (Trigger-Badge).
 * @param {Array<string|{value:string,label?:string}>} [props.allowedStatuses=[]] - nur valide Transitions.
 * @param {(status:string)=>void} [props.onChange]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.defaultOpen=false] - Initial-Öffnungszustand (Story/SSR).
 * @param {string} [props['data-ui']='organism.status-badge-select']
 * @param {string} [props.className]
 */
export default function StatusBadgeSelect({
  status,
  allowedStatuses = [],
  onChange,
  disabled = false,
  defaultOpen = false,
  'data-ui': dataUi = 'organism.status-badge-select',
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen)
  const options = allowedStatuses.map((o) => (typeof o === 'string' ? { value: o } : o))

  const choose = (val) => {
    setOpen(false)
    onChange?.(val)
  }

  return (
    <div data-ui={dataUi} className={`relative inline-flex ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        data-ui={`${dataUi}.trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        trailingIcon={
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={open ? 'rotate-180' : ''}
          />
        }
      >
        <StatusBadge status={status} />
      </Button>
      {open ? (
        <ul
          data-ui={`${dataUi}.menu`}
          role="listbox"
          className="absolute start-0 top-full z-20 mt-1 flex min-w-full flex-col gap-0.5 rounded-md border border-[var(--surface1)] bg-[var(--base)] p-1 shadow-lg"
        >
          {options.map((o) => (
            <li key={o.value}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => choose(o.value)}
                data-ui={`${dataUi}.option-${o.value}`}
                role="option"
                aria-selected={o.value === status}
                className="w-full justify-start"
              >
                <StatusBadge status={o.value} />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
