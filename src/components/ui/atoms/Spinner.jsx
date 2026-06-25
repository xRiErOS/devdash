import { Loader2 } from 'lucide-react'

/**
 * Spinner — token-sauberer Lade-Indikator (DevDash-Design). Rotierendes lucide
 * Loader2-Icon (animate-spin). Pures Atom: props-driven, kein Store/Fetch, keine
 * Domänen-Begriffe. Kein inline-style, nur var(--token)-Klassen.
 *
 * A11y: `role="status"` + `aria-label` (Default "Lädt") machen den
 * Indeterminierten-Zustand für Screenreader hörbar; das SVG selbst ist
 * dekorativ. Farbe folgt `--accent-primary` (currentColor via text-Token).
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Kantenlänge des Spinners
 * @param {string} [props.label='Lädt'] - aria-label (sprechende Bedeutung)
 * @param {string} [props.className] - zusätzliche Klassen am Root
 */
const SIZE = { sm: 14, md: 18, lg: 24 }

export default function Spinner({ size = 'md', label = 'Lädt', className = '', ...rest }) {
  const px = SIZE[size] || SIZE.md
  return (
    <span
      data-ui="spinner"
      role="status"
      aria-label={label}
      className={`inline-flex text-[var(--accent-primary)] ${className}`}
      {...rest}
    >
      <Loader2 size={px} strokeWidth={2} aria-hidden className="animate-spin" />
    </span>
  )
}
