/**
 * SegmentBar — DD-481 Atom. Token-saubere, mehrsegmentige Verhältnis-Leiste
 * (Stacked-Bar). Verallgemeinert ProgressBar auf N farbcodierte Segmente für
 * Status-Verteilungen — z.B. die Issue-Status-Mischung eines Sprints
 * (done / to_review / open) als eine Leiste. Props-driven, kein Store/Fetch,
 * keine Domänen-Logik.
 *
 * Jedes Segment erhält seine Breite runtime-dynamisch via CSS-Custom-Property
 * (--seg-pct) in eine Tailwind-arbitrary-Klasse (w-[var(--seg-pct)]) — die
 * einzige sanktionierte style-Zuweisung (maxInline=1, analog ProgressBar).
 *
 * @param {object} props
 * @param {Array<{value:number, tone:string, label?:string}>} [props.segments=[]]
 *        - Segmente in Render-Reihenfolge; `tone` ∈ TONE-Keys. value<=0 → übersprungen.
 * @param {'xs'|'sm'|'md'|'lg'} [props.size='sm'] - Track-Höhe
 * @param {'surface0'|'surface1'|'surface2'} [props.track='surface1'] - Rest-/Track-Farbe (Rundungs-Gaps)
 * @param {string} [props.label] - aria-label (Gesamtbeschreibung)
 * @param {string} [props.dataUiScope='segment-bar'] - Wurzel-data-ui-bereich
 * @param {string} [props.className] - zusätzliche Klassen (z.B. Breite)
 */
const SIZE = {
  xs: 'h-[3px]',
  sm: 'h-1.5',
  md: 'h-[6px]',
  lg: 'h-2',
}

const TRACK = {
  surface0: 'bg-[var(--surface0)]',
  surface1: 'bg-[var(--surface1)]',
  surface2: 'bg-[var(--surface2)]',
}

// Statische Tailwind-arbitrary-Klassen je Tone, damit der JIT-Scanner sie
// literal sieht (keine String-Interpolation im Token).
const TONE = {
  success: 'bg-[var(--accent-success)]',
  warning: 'bg-[var(--accent-warning)]',
  danger: 'bg-[var(--accent-danger)]',
  info: 'bg-[var(--accent-info)]',
  primary: 'bg-[var(--accent-primary)]',
  lavender: 'bg-[var(--lavender)]',
  mauve: 'bg-[var(--mauve)]',
  neutral: 'bg-[var(--surface2)]',
}

export default function SegmentBar({
  segments = [],
  size = 'sm',
  track = 'surface1',
  label,
  dataUiScope = 'segment-bar',
  className = '',
}) {
  const parts = segments.filter((s) => s.value > 0)
  const total = parts.reduce((sum, s) => sum + s.value, 0)

  return (
    <div
      data-ui={dataUiScope}
      role="img"
      aria-label={label}
      className={`flex ${SIZE[size] || SIZE.sm} ${TRACK[track] || TRACK.surface1} overflow-hidden rounded-full ${className}`}
    >
      {total > 0 &&
        parts.map((seg, i) => {
          const pct = Math.round((seg.value / total) * 100)
          return (
            <span
              key={`${seg.tone}-${i}`}
              data-ui={`${dataUiScope}.segment-${seg.tone}`}
              data-tone={seg.tone}
              title={seg.label}
              // eslint-disable-next-line react/forbid-dom-props -- runtime-dynamische Segmentbreite via CSS-Custom-Property; kein statischer Style möglich
              style={{ '--seg-pct': `${pct}%` }}
              className={`h-full w-[var(--seg-pct)] ${TONE[seg.tone] || TONE.neutral} first:rounded-l-full last:rounded-r-full`}
            />
          )
        })}
    </div>
  )
}
