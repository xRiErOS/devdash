/**
 * Badge — read-only Label-Pill (kein Button, kein onClick).
 *
 * @param {object} props
 * @param {'neutral'|'muted'|'accent'} [props.tone='neutral']
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.mono=false] - Mono-Font + tracking-wide (z.B. Prefix-Keys)
 * @param {React.ReactNode} props.children
 * @param {string} [props.dataUiScope='badge']
 * @param {string} [props.className]
 */

const TONES = {
  neutral: 'text-[var(--subtext1)] bg-[var(--surface0)]',
  muted:   'text-[var(--subtext1)] bg-[var(--surface1)]',
  accent:  'text-[var(--accent-primary)] bg-[var(--surface1)] font-medium',
}
const SIZES = {
  sm: 'px-[var(--space-1)] py-px',
  md: 'px-[var(--space-2)] py-px',
}

export default function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  mono = false,
  dataUiScope = 'badge',
  className = '',
  ...rest
}) {
  const fontClass = mono
    ? '[font-family:var(--font-mono)] tracking-wide'
    : '[font-family:var(--font-display)]'
  return (
    <span
      data-ui={dataUiScope}
      className={`${fontClass} text-[11px] ${TONES[tone] ?? TONES.neutral} ${SIZES[size] ?? SIZES.md} rounded-sm ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
