import { Sparkles, Bug, ArrowUpRight, Wrench, Code2, ShieldCheck, CircleHelp } from 'lucide-react'

/**
 * typeIcons — kanonisches, token-sauberes Mapping (DD-56 Harvest).
 * Reines Display-Atom: Mapping Type → Lucide-Icon + Label + Akzent-Token.
 * Props-driven, kein Store/Fetch. Spezialfall: named exports statt default-Component.
 *
 * Quelle: src/components/ui/typeIcons.jsx (TYPE_ICON_MAP + TYPE_LABELS + TypeIcon).
 * Hier verlustfrei geharvestet; der ehemalige inline Color-Style in TypeIcon
 * wird über eine statische Token-Klassen-Map ersetzt (TYPE_COLOR_CLASS), JIT-sichtbar.
 */

// Type → Lucide-Icon-Komponente.
export const TYPE_ICON_MAP = {
  feature: Sparkles,
  bug: Bug,
  improvement: ArrowUpRight,
  chore: Wrench,
  refactor: Code2,
  security: ShieldCheck,
}

// Type → Anzeige-Label.
export const TYPE_LABELS = {
  feature: 'Feature',
  bug: 'Bug',
  improvement: 'Improvement',
  chore: 'Chore',
  refactor: 'Refactor',
  security: 'Security',
}

// Type → Akzent-Farbklasse (Tailwind-arbitrary, statisch → JIT-sichtbar).
// Ersetzt den ehemaligen inline Color-Style; Default = subtext0.
export const TYPE_COLOR_CLASS = {
  feature: 'text-[var(--accent-primary)]',
  bug: 'text-[var(--accent-danger)]',
  improvement: 'text-[var(--accent-info)]',
  chore: 'text-[var(--subtext0)]',
  refactor: 'text-[var(--accent-success)]',
  security: 'text-[var(--accent-warning)]',
}

/**
 * <TypeIcon type size /> — kapselt Mapping + Fallback.
 * @param {object} props
 * @param {string} props.type - Issue-Type (feature/bug/...)
 * @param {number} [props.size=14] - Icon-Kantenlänge in px
 * @param {string} [props.className] - zusätzliche Klassen (z.B. Override-Farbe)
 */
export function TypeIcon({ type, size = 14, className = '', ...rest }) {
  const Cmp = TYPE_ICON_MAP[type] || CircleHelp
  const colorClass = TYPE_COLOR_CLASS[type] || 'text-[var(--subtext0)]'
  return (
    <Cmp
      data-ui="type-icon"
      size={size}
      strokeWidth={2}
      aria-label={type}
      className={`${colorClass} ${className}`}
      {...rest}
    />
  )
}
