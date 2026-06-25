import { Loader2 } from 'lucide-react'

/**
 * Button — DD#61 Atom. Token-saubere Action-Button-Primitive (greenfield,
 * harvested aus BulkBar / SprintActions / IconButton). Props-driven, kein Store.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Button-Label
 * @param {'primary'|'secondary'|'ghost'|'danger'|'success'} [props.variant='primary']
 * @param {'solid'|'tint'} [props.appearance='solid'] - Farb-Treatment: `solid` (gefüllt,
 *   Default, unverändert) | `tint` (Terminal: ton-getönter BG + Rand, scharfe Kante
 *   `--radius-sm`) — border-driven für die EntityDetail-V2-Terminal-Sprache (GF-337).
 * @param {'sm'|'md'|'lg'} [props.size='md'] - lg = 44px Touch-Target
 * @param {React.ReactNode} [props.leadingIcon] - Icon links (z.B. Lucide-Element)
 * @param {React.ReactNode} [props.trailingIcon] - Icon rechts
 * @param {boolean} [props.loading=false] - zeigt Spinner, disabled + aria-busy
 * @param {boolean} [props.disabled=false]
 * @param {'button'|'submit'|'reset'} [props.type='button']
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 */
const VARIANT = {
  primary: 'bg-[var(--accent-primary)] text-[var(--on-accent)]',
  secondary: 'bg-[var(--surface1)] text-[var(--text)]',
  ghost: 'bg-transparent text-[var(--subtext0)] hover:bg-[var(--surface0)]',
  danger: 'bg-[var(--accent-danger)] text-[var(--on-accent)]',
  success: 'bg-[var(--accent-success)] text-[var(--on-accent)]',
}

// Terminal-Treatment (GF-337): ton-getönter BG (color-mix ~16%) + Rand (~34%), Text im
// vollen Akzent. Literale Lookup-Map (Tailwind-JIT scannt nur literale Strings).
const TINT = {
  primary: 'bg-[color-mix(in_oklab,var(--accent-primary)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-primary)_34%,transparent)] text-[var(--accent-primary)]',
  secondary: 'bg-[var(--surface0)] border border-[var(--surface2)] text-[var(--subtext0)]',
  ghost: 'bg-transparent border border-[var(--surface2)] text-[var(--subtext0)] hover:bg-[var(--surface0)]',
  danger: 'bg-[color-mix(in_oklab,var(--accent-danger)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-danger)_34%,transparent)] text-[var(--accent-danger)]',
  success: 'bg-[color-mix(in_oklab,var(--accent-success)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent-success)_34%,transparent)] text-[var(--accent-success)]',
}

// appearance → Form: solid bleibt rounded-lg (unverändert); tint = scharf (--radius-sm).
const RADIUS = { solid: 'rounded-lg', tint: 'rounded-sm' }

const SIZE = {
  sm: 'h-7 text-[11px] px-2',
  md: 'h-9 text-xs px-3',
  lg: 'h-11 text-sm px-4',
}

export default function Button({
  children,
  variant = 'primary',
  appearance = 'solid',
  size = 'md',
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading
  const tone = appearance === 'tint'
    ? (TINT[variant] || TINT.primary)
    : (VARIANT[variant] || VARIANT.primary)
  const radius = RADIUS[appearance] || RADIUS.solid

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-ui="button"
      className={`inline-flex items-center justify-center gap-2 ${radius} font-medium whitespace-nowrap transition duration-[var(--duration-fast)] ease-standard hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-[length:var(--border-width-l)] focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--base)] disabled:opacity-50 disabled:cursor-not-allowed ${tone} ${SIZE[size] || SIZE.md} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={14} aria-hidden />
      ) : (
        leadingIcon
      )}
      {children}
      {!loading && trailingIcon}
    </button>
  )
}
