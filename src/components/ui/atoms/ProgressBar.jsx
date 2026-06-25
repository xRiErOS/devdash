/**
 * ProgressBar — DD#61 Atom. Token-saubere Fortschritts-/Auslastungs-Leiste
 * (greenfield, harvested aus den 5 inline-Bar-Varianten: SprintHeader-Kapazität
 * primitives.jsx, SprintDetail-Progress, den ehemaligen Roadmap-Modi done/total +
 * status-bar / dod-progress). Props-driven, kein Store, keine Domänen-Logik.
 *
 * Track + Fill. Die Fill-Breite ist runtime-dynamisch (pct) und wird per
 * CSS-Custom-Property in eine Tailwind-arbitrary-Klasse (w-[var(--pb-pct)])
 * gereicht — die einzige sanktionierte style-Zuweisung (maxInline=1).
 *
 * @param {object} props
 * @param {number} [props.value] - Ist-Wert; mit max zu Prozent verrechnet
 * @param {number} [props.max] - Soll-Wert (Default 100)
 * @param {number} [props.percent] - direkter Prozentwert (überschreibt value/max)
 * @param {'xs'|'sm'|'md'|'lg'} [props.size='sm'] - Track-Höhe (3px/6px/8px? s. Map)
 * @param {'surface0'|'surface1'|'surface2'} [props.track='surface1'] - Track-Farbe
 * @param {'success'|'warning'|'danger'|'info'|'primary'|'neutral'} [props.tone='success']
 *        - Fill-Farbe, ignoriert wenn capacity=true
 * @param {boolean} [props.capacity=false] - Auslastungs-Modus: Farbe nach Schwelle
 *        (>=100 danger, >=80 warning, sonst success)
 * @param {string} [props.maxWidth] - optionale Tailwind-Klasse, z.B. 'max-w-[480px]'
 * @param {string} [props.label] - aria-label
 * @param {string} [props.className]
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

const TONE = {
  success: 'bg-[var(--accent-success)]',
  warning: 'bg-[var(--accent-warning)]',
  danger: 'bg-[var(--accent-danger)]',
  info: 'bg-[var(--accent-info)]',
  primary: 'bg-[var(--accent-primary)]',
  neutral: 'bg-[var(--subtext0)]',
}

const capacityBand = (pct) =>
  pct >= 100 ? TONE.danger : pct >= 80 ? TONE.warning : TONE.success

export default function ProgressBar({
  value,
  max = 100,
  percent,
  size = 'sm',
  track = 'surface1',
  tone = 'success',
  capacity = false,
  maxWidth = '',
  label,
  className = '',
  ...rest
}) {
  const raw = percent != null ? percent : max ? (value / max) * 100 : 0
  const pct = Math.max(0, Math.min(100, Math.round(raw)))
  const fillColor = capacity ? capacityBand(pct) : TONE[tone] || TONE.success

  return (
    <div
      data-ui="progress-bar"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`${SIZE[size] || SIZE.sm} ${TRACK[track] || TRACK.surface1} ${maxWidth} overflow-hidden rounded-full ${className}`}
      {...rest}
    >
      <div
        data-ui="progress-bar.fill"
        // eslint-disable-next-line react/forbid-dom-props -- runtime-dynamischer Prozentwert via CSS-Custom-Property; kein statischer Style möglich
        style={{ '--pb-pct': `${pct}%` }}
        className={`h-full w-[var(--pb-pct)] rounded-full transition-all ${fillColor}`}
      />
    </div>
  )
}
