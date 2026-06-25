/**
 * SegmentedControl — DD#61 Molecule (Harvest aus ui/SegmentedControl.jsx).
 * Komponiert >=2 Buttons zu einer Radiogroup (mutually exclusive Options).
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {Array<{value, label, color?, testId?}>} props.options - Optionen; color = Akzent-Token-Suffix
 * @param {*} props.value - aktuell gewählter Wert
 * @param {(value) => void} props.onChange - Callback bei Auswahl
 * @param {string} [props.ariaLabel] - aria-label der Radiogroup
 * @param {'sm'|'md'|'touch'} [props.size='md'] - Höhe der Segmente (touch = 44px, Mobile)
 * @param {boolean} [props.mirrorAriaPressed=false] - zusätzlich aria-pressed spiegeln (Bestands-E2E)
 * @param {string} [props.className]
 */

// Aktiv-Hintergrund je Option-Color. Statisch, damit Tailwind-JIT die Klassen
// literal sieht (keine String-Interpolation im Token).
const ACTIVE_BG = {
  primary: 'bg-[var(--accent-primary)]',
  success: 'bg-[var(--accent-success)]',
  danger: 'bg-[var(--accent-danger)]',
  warning: 'bg-[var(--accent-warning)]',
  info: 'bg-[var(--accent-info)]',
}

const SIZE = {
  sm: 'min-h-7',
  md: 'min-h-8',
  // #14 (PO 2026-06-22): touch-taugliche Stufe für Mobile — 44px (Apple HIG Minimum).
  touch: 'min-h-11',
}

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className = '',
  mirrorAriaPressed = false,
}) {
  const sizeClass = SIZE[size] || SIZE.md
  return (
    <div
      data-ui="segmented-control"
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex rounded-lg overflow-hidden border border-[var(--surface1)] ${className}`}
    >
      {options.map((opt, i) => {
        const isActive = opt.value === value
        const activeBg = ACTIVE_BG[opt.color] || ACTIVE_BG.info
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-pressed={mirrorAriaPressed ? isActive : undefined}
            data-ui={`segmented-control.option.${opt.value}`}
            data-testid={opt.testId}
            onClick={() => onChange?.(opt.value)}
            className={`px-3 text-xs font-medium transition-colors ${sizeClass} ${
              i > 0 ? 'border-l border-[var(--surface1)]' : ''
            } ${
              isActive
                ? `${activeBg} text-[var(--on-accent)]`
                : 'bg-transparent text-[var(--subtext0)]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
