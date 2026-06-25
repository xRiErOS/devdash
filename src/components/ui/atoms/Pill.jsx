/**
 * Pill — kanonische, token-saubere Variante (DD-56 Harvest).
 * Wiederverwendbarer Badge mit Variants/Colors/Sizes.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {'filled'|'outline'|'ghost'} [props.variant='filled'] - visueller Stil (nur bei appearance=solid)
 * @param {'solid'|'tint'} [props.appearance='solid'] - Farb-Treatment analog Button (GF-337):
 *   `solid` (Default, variant/color wie bisher) | `tint` (Terminal-V2: getönter BG color-mix ~16%
 *   + Rand ~34% + Text im vollen Akzent, scharfe Kante rounded-sm — überschreibt `variant`).
 * @param {'primary'|'success'|'danger'|'warning'|'info'|'neutral'} [props.color='neutral'] - Akzentfarbe
 * @param {'sm'|'md'} [props.size='sm'] - Größe
 * @param {import('react').ReactNode} [props.children] - Label-Inhalt
 * @param {string} [props.className] - zusätzliche Klassen
 */

// Tailwind-arbitrary-Klassen je (variant × color). Statisch, damit der
// Tailwind-JIT-Scanner die Werte sieht (keine String-Interpolation im Token).
const FILLED = {
  primary: 'bg-[var(--accent-primary)] text-[var(--on-accent)]',
  success: 'bg-[var(--accent-success)] text-[var(--on-accent)]',
  danger: 'bg-[var(--accent-danger)] text-[var(--on-accent)]',
  warning: 'bg-[var(--accent-warning)] text-[var(--on-accent)]',
  info: 'bg-[var(--accent-info)] text-[var(--on-accent)]',
  neutral: 'bg-[var(--surface2)] text-[var(--on-accent)]',
}

const OUTLINE = {
  primary:
    'bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] text-[var(--accent-primary)] border border-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]',
  success:
    'bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)] text-[var(--accent-success)] border border-[color-mix(in_srgb,var(--accent-success)_35%,transparent)]',
  danger:
    'bg-[color-mix(in_srgb,var(--accent-danger)_12%,transparent)] text-[var(--accent-danger)] border border-[color-mix(in_srgb,var(--accent-danger)_35%,transparent)]',
  warning:
    'bg-[color-mix(in_srgb,var(--accent-warning)_12%,transparent)] text-[var(--accent-warning)] border border-[color-mix(in_srgb,var(--accent-warning)_35%,transparent)]',
  info:
    'bg-[color-mix(in_srgb,var(--accent-info)_12%,transparent)] text-[var(--accent-info)] border border-[color-mix(in_srgb,var(--accent-info)_35%,transparent)]',
  neutral:
    'bg-[color-mix(in_srgb,var(--surface2)_12%,transparent)] text-[var(--text)] border border-[color-mix(in_srgb,var(--surface2)_35%,transparent)]',
}

const GHOST = {
  primary: 'bg-transparent text-[var(--accent-primary)]',
  success: 'bg-transparent text-[var(--accent-success)]',
  danger: 'bg-transparent text-[var(--accent-danger)]',
  warning: 'bg-transparent text-[var(--accent-warning)]',
  info: 'bg-transparent text-[var(--accent-info)]',
  neutral: 'bg-transparent text-[var(--subtext0)]',
}

// Terminal-V2-Treatment je Color (GF-337-Sprache, analog Button TINT): getönter BG +
// Rand, Text im vollen Akzent. Überschreibt `variant`, wenn appearance=tint.
const TINT = {
  primary: 'bg-[color-mix(in_oklab,var(--accent-primary)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-primary)_34%,transparent)] text-[var(--accent-primary)]',
  success: 'bg-[color-mix(in_oklab,var(--accent-success)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-success)_34%,transparent)] text-[var(--accent-success)]',
  danger: 'bg-[color-mix(in_oklab,var(--accent-danger)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-danger)_34%,transparent)] text-[var(--accent-danger)]',
  warning: 'bg-[color-mix(in_oklab,var(--accent-warning)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-warning)_34%,transparent)] text-[var(--accent-warning)]',
  info: 'bg-[color-mix(in_oklab,var(--accent-info)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-info)_34%,transparent)] text-[var(--accent-info)]',
  neutral: 'bg-[var(--surface0)] border border-[var(--surface2)] text-[var(--subtext0)]',
}

const VARIANT_MAP = { filled: FILLED, outline: OUTLINE, ghost: GHOST }

const SIZE_MAP = {
  sm: 'text-[11px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
}

// appearance → Form: solid = rounded; tint = scharf (rounded-sm, Terminal).
const RADIUS = { solid: 'rounded', tint: 'rounded-sm' }

export default function Pill({
  variant = 'filled',
  appearance = 'solid',
  color = 'neutral',
  size = 'sm',
  children,
  className = '',
  ...rest
}) {
  const toneClasses = appearance === 'tint'
    ? (TINT[color] || TINT.neutral)
    : ((VARIANT_MAP[variant] || FILLED)[color] || FILLED.neutral)
  const radius = RADIUS[appearance] || RADIUS.solid
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.sm

  return (
    <span
      data-ui="pill"
      className={`inline-flex items-center gap-1 ${radius} font-medium ${sizeClasses} ${toneClasses} ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
