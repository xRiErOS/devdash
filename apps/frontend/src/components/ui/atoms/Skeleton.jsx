/**
 * Skeleton — Atom (03.20 Display, NEU). Token-sauberer Lade-Platzhalter.
 * animate-pulse, Fläche `--surface1`, rounded. Reines Display → `aria-hidden`,
 * damit Screenreader den Platzhalter überspringen. Props-driven, kein Store/Fetch.
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex. width/height über Tailwind-v4-Arbitrary
 * (`w-[…]`/`h-[…]`), Fläche via `bg-[var(--surface1)]`.
 *
 * @param {object} props
 * @param {'line'|'block'|'circle'} [props.variant='line'] - Form-Achse:
 *   line = schlanke Textzeile (rounded), block = Flächen-/Karten-Platzhalter
 *   (rounded-lg), circle = Avatar-/Icon-Platzhalter (rounded-full, 1:1).
 * @param {string} [props.width] - CSS-Breite (z.B. '50%', '3rem') → `w-[…]`.
 * @param {string} [props.height] - CSS-Höhe (z.B. '2rem') → `h-[…]`.
 * @param {string} [props.className] - zusätzliche Klassen am Root.
 */
const VARIANT = {
  line: 'rounded h-3',
  block: 'rounded-lg h-24',
  circle: 'rounded-full w-10 h-10',
}

export default function Skeleton({ variant = 'line', width, height, className = '', ...rest }) {
  const shape = VARIANT[variant] || VARIANT.line
  const w = width ? `w-[${width}]` : variant === 'circle' ? '' : 'w-full'
  const h = height ? `h-[${height}]` : ''
  return (
    <div
      data-ui="skeleton"
      aria-hidden="true"
      className={`animate-pulse bg-[var(--surface1)] ${shape} ${w} ${h} ${className}`}
      {...rest}
    />
  )
}
