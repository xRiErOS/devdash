/**
 * Tag — read-only Metadaten-Marker (GF-227 / D06). EIN Wert: Label + Farb-Token.
 * Bewusst minimal: kein Variant, kein State, kein Remove-Affordance — das ist der
 * interaktive TagChip (Molecule, sprint-02), der Tag komponiert. Props-driven,
 * kein Store. Farb-Punkt macht die Kategorie auf einen Blick lesbar.
 *
 * @param {object} props
 * @param {'neutral'|'primary'|'success'|'danger'|'warning'|'info'} [props.color='neutral'] - Farb-Token
 * @param {import('react').ReactNode} [props.children] - Label
 * @param {string} [props.className]
 */

// Statische (color)-Klassen-Maps, damit der Tailwind-JIT die Tokens sieht (keine
// String-Interpolation). Tonal-zurückhaltend (Tag = niedrige Emphase, im Gegensatz
// zur Pill). 0 Roh-Hex — nur var(--token) / color-mix.
const TONE = {
  neutral: 'bg-[var(--surface1)] text-[var(--subtext0)]',
  primary: 'bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-[var(--accent-primary)]',
  success: 'bg-[color-mix(in_srgb,var(--accent-success)_14%,transparent)] text-[var(--accent-success)]',
  danger: 'bg-[color-mix(in_srgb,var(--accent-danger)_14%,transparent)] text-[var(--accent-danger)]',
  warning: 'bg-[color-mix(in_srgb,var(--accent-warning)_14%,transparent)] text-[var(--accent-warning)]',
  info: 'bg-[color-mix(in_srgb,var(--accent-info)_14%,transparent)] text-[var(--accent-info)]',
}

const DOT = {
  neutral: 'bg-[var(--overlay1)]',
  primary: 'bg-[var(--accent-primary)]',
  success: 'bg-[var(--accent-success)]',
  danger: 'bg-[var(--accent-danger)]',
  warning: 'bg-[var(--accent-warning)]',
  info: 'bg-[var(--accent-info)]',
}

export default function Tag({ color = 'neutral', children, className = '', ...rest }) {
  const tone = TONE[color] || TONE.neutral
  const dot = DOT[color] || DOT.neutral
  return (
    <span
      data-ui="tag"
      // Mikro-Spacing px-fest (CONV-token-units): gap/padding via --space-Tokens,
      // py-[2px] als feste Sub-8px-Größe. font-size 11px wie Pill.
      className={`inline-flex items-center gap-[var(--space-1)] rounded px-[var(--space-2)] py-[2px] text-[11px] font-medium ${tone} ${className}`}
      {...rest}
    >
      <span data-ui="tag.dot" aria-hidden="true" className={`h-[6px] w-[6px] shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  )
}
