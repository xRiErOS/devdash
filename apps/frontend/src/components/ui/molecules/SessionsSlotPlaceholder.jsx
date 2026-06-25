/**
 * SessionsSlotPlaceholder — kanonische, token-saubere Variante (DD-481 Harvest).
 * Generischer "Coming-Soon"-Slot-Platzhalter: Icon + Titel + Meta-Zeile.
 * Props-driven, kein Store/Fetch, keine Domänen-Logik. Reine Display-Props.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon='⌛'] - Platzhalter-Icon (aria-hidden)
 * @param {string} [props.title='Sessions'] - Slot-Titel
 * @param {string} [props.meta='Coming in M4 · Claude Code Sessions Live-View'] - Meta-/Untertitel-Zeile
 * @param {string} [props.ariaLabel='Sessions-Slot — wird in M4 aktiviert'] - aria-label der Region
 * @param {string} [props.className] - zusätzliche Klassen
 */

// Statische Tailwind-Klassen — der JIT-Scanner muss alle Token-Werte literal sehen.
const ROOT =
  'flex items-center gap-3 rounded-lg p-4 bg-[var(--surface1)] border border-[color-mix(in_srgb,var(--surface2)_60%,transparent)]'

const ICON = 'text-2xl leading-none text-[var(--subtext1)]'

const TITLE = 'text-sm font-medium text-[var(--text)]'

const META = 'text-xs text-[var(--subtext0)]'

export default function SessionsSlotPlaceholder({
  icon = '⌛',
  title = 'Sessions',
  meta = 'Coming in M4 · Claude Code Sessions Live-View',
  ariaLabel = 'Sessions-Slot — wird in M4 aktiviert',
  className = '',
  ...rest
}) {
  return (
    <div
      data-ui="sessions-slot-placeholder"
      className={`${ROOT} ${className}`}
      role="region"
      aria-label={ariaLabel}
      {...rest}
    >
      <div data-ui="sessions-slot-placeholder.icon" className={ICON} aria-hidden="true">
        {icon}
      </div>
      <div data-ui="sessions-slot-placeholder.body" className="flex flex-col gap-0.5">
        <div data-ui="sessions-slot-placeholder.title" className={TITLE}>{title}</div>
        <div data-ui="sessions-slot-placeholder.value" className={META}>{meta}</div>
      </div>
    </div>
  )
}
