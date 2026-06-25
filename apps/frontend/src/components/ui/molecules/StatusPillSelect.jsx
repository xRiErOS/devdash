import Select from '../atoms/Select.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'

/**
 * StatusPillSelect — Molecule (04.10 Form, GF-231). Stellt den aktuellen Status
 * als `StatusBadge` dar und bietet daneben ein `Select`-Atom zum Wechsel.
 *
 * Bewusst DUMB-Molecule (CONV-molecule-boundary, I02): rein präsentational, KEINE
 * Lifecycle-/Transition-/Validierungs-Logik. Das `Select` ist controlled über
 * `status`; den Wechsel (inkl. erlaubter Transitions, Persistenz) verdrahtet der
 * konsumierende Organismus über `onChange` (via `...rest`). Mit Transition-Logik
 * wäre dies ein Organismus — hier absichtlich nicht.
 *
 * @param {object} props
 * @param {string} props.status - aktueller Status-Schlüssel (Badge + Select-value).
 * @param {Array<string|{value:string,label:React.ReactNode}>} [props.options] - wählbare Status.
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className] - zusätzliche Klassen am Wrapper.
 */
export default function StatusPillSelect({
  status,
  options = [],
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <div data-ui="status-pill-select" className={`inline-flex items-center gap-2 ${className}`}>
      <span data-ui="status-pill-select.badge" className="shrink-0">
        <StatusBadge status={status} className="whitespace-nowrap" />
      </span>
      {/* Select in fester Breite kapseln: das Select-Atom ist w-full und würde im
          inline-flex sonst den Badge zusammenquetschen (B01 → Badge-Umbruch). */}
      <span className="w-40 shrink-0">
        <Select
          value={status}
          options={options}
          disabled={disabled}
          size="sm"
          data-ui="status-pill-select.select"
          {...rest}
        />
      </span>
    </div>
  )
}
