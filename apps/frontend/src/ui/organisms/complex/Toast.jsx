/**
 * Toast — flüchtige Erfolgs-/Status-Notiz (z.B. „Anhang hinzugefügt").
 * Inline-Banner ohne Rundung, grün-transparent hinterlegt. Konkreter Organism,
 * presentational. Komponiert das `Icon`-Atom (Registry) + Text.
 *
 * @param {object} props
 * @param {'success'} [props.kind='success'] - Ton (aktuell nur success)
 * @param {React.ReactNode} props.message - Meldungstext
 * @param {string} [props.dataUiScope='organism.toast']
 */
import Icon from '../../foundations/Icon.jsx'

const TONE = {
  success: {
    icon: 'success',
    role: 'success',
    bg: 'bg-[color-mix(in_srgb,var(--accent-success)_14%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--accent-success)_45%,transparent)]',
  },
}

export default function Toast({ kind = 'success', message, dataUiScope = 'organism.toast' }) {
  const tone = TONE[kind] || TONE.success
  return (
    <div
      data-ui={dataUiScope}
      role="status"
      className={`inline-flex items-center gap-[6px] px-[var(--space-3)] py-1 border rounded-none ${tone.bg} ${tone.border}`}
    >
      <Icon name={tone.icon} role={tone.role} size={14} />
      <span
        data-ui={`${dataUiScope}.message`}
        className="text-[var(--text)] [font-family:var(--font-display)] text-xs"
      >
        {message}
      </span>
    </div>
  )
}
