/**
 * StatusDot — Lifecycle-Status als farbiger Punkt + Label.
 *
 * Übersetzt den rohen Status-String (beliebige Entität) über
 * `foundations/statusTone.js` in Catppuccin-Töne (Spiegel der kanonischen
 * STATUS_COLORS aus lifecycle.js, PO-Entscheidung D1). Reines Display-Atom.
 * Native Issue-Tracker-Sprache: Dot + Label statt boxed Pill.
 *
 * @param {object} props
 * @param {string} props.status - roher Status (z.B. 'refined', 'in_progress', 'done')
 * @param {React.ReactNode} [props.label] - sichtbarer Text (sonst nur der Punkt)
 * @param {string} [props.dataUiScope='statusDot'] - data-ui-Namensraum
 * @param {string} [props.className]
 */
import { statusTone } from '../foundations/statusTone.js'

export default function StatusDot({ status, label, dataUiScope = 'statusDot', className = '', ...rest }) {
  const tone = statusTone(status)
  return (
    <span
      data-ui={dataUiScope}
      className={`inline-flex items-center gap-1.5 [font-family:var(--font-display)] text-xs font-semibold ${tone.text} ${className}`}
      {...rest}
    >
      <span data-ui={`${dataUiScope}.dot`} className={`size-[7px] rounded-full ${tone.dot}`} />
      {label}
    </span>
  )
}
