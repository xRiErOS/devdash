/**
 * MetaTag — Atom (03.20 Display). Mono `key:value`-Chip im Terminal-Stil
 * (EntityDetail V2): Schlüssel gedämpft, Wert farbig nach `tone`. Hausschrift
 * --font-display (JetBrains Mono). Abgrenzung zu `Tag` (Farbpunkt-Marker, ein Wert)
 * und `Pill` (Badge): MetaTag transportiert ein Schlüssel-Wert-Paar als Code-Token.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.label] - Schlüssel (ohne Doppelpunkt).
 * @param {import('react').ReactNode} props.value - Wert (farbig).
 * @param {'peach'|'blue'|'mauve'|'teal'|'green'|'red'|'yellow'|'neutral'} [props.tone='neutral']
 * @param {string} [props.className]
 */

// Statische Ton→Token-Klassen (Tailwind-JIT-scanbar, keine String-Interpolation).
const TONE = {
  peach: 'text-[var(--peach)]',
  blue: 'text-[var(--blue)]',
  mauve: 'text-[var(--mauve)]',
  teal: 'text-[var(--teal)]',
  green: 'text-[var(--green)]',
  red: 'text-[var(--red)]',
  yellow: 'text-[var(--yellow)]',
  neutral: 'text-[var(--text)]',
}

export default function MetaTag({ label, value, tone = 'neutral', className = '', ...rest }) {
  return (
    <span
      data-ui="meta-tag"
      className={`inline-flex items-center [font-family:var(--font-display)] text-[12px] text-[var(--subtext1)] ${className}`}
      {...rest}
    >
      {label ? <span className="text-[var(--overlay1)]">{label}:</span> : null}
      <span className={`font-semibold ${TONE[tone] || TONE.neutral}`}>{value}</span>
    </span>
  )
}
