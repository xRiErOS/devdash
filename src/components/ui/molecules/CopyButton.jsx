import { Copy, Check, AlertCircle } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'
import Tooltip from '../atoms/Tooltip.jsx'

/**
 * CopyButton — Molecule (04.30 Action, GF-237). Ein IconButton in einem Tooltip,
 * der ein transientes Feedback zum Kopier-Ergebnis anzeigt: idle (Copy), success
 * (Check) oder error (AlertCircle, Danger).
 *
 * Bewusst DUMB-Molecule (CONV-molecule-boundary): der Clipboard-Write (Side-Effect)
 * und der Reset-Timer liegen NICHT hier, sondern beim konsumierenden Organismus
 * (Pattern `useCopyFeedback`, DD-675). `state` (bzw. der Back-Compat-Alias
 * `copied`) ist ein Prop; `onCopy` ist der Klick-Callback. Token-clean.
 *
 * @param {object} props
 * @param {'idle'|'success'|'error'} [props.state='idle'] - Feedback-Zustand.
 * @param {boolean} [props.copied=false] - Back-Compat-Alias: true → state='success'.
 * @param {()=>void} [props.onCopy] - Klick-Callback (Consumer schreibt Clipboard).
 * @param {string} [props.label='Kopieren'] - aria/Tooltip im Idle-Zustand.
 * @param {string} [props.copiedLabel='Kopiert'] - aria/Tooltip bei success.
 * @param {string} [props.errorLabel='Kopieren fehlgeschlagen'] - aria/Tooltip bei error.
 * @param {'sm'|'md'|'lg'} [props.size='sm']
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className]
 */
const ICON = { idle: Copy, success: Check, error: AlertCircle }
const VARIANT = { idle: 'ghost', success: 'default', error: 'danger' }

export default function CopyButton({
  state,
  copied = false,
  onCopy,
  label = 'Kopieren',
  copiedLabel = 'Kopiert',
  errorLabel = 'Kopieren fehlgeschlagen',
  size = 'sm',
  disabled = false,
  className = '',
  ...rest
}) {
  const resolved = state || (copied ? 'success' : 'idle')
  const LabelByState = { idle: label, success: copiedLabel, error: errorLabel }
  const current = LabelByState[resolved] || label
  const Glyph = ICON[resolved] || Copy
  return (
    <span data-ui="copy-button" className={`inline-flex ${className}`} {...rest}>
      <Tooltip label={current}>
        <IconButton
          icon={<Glyph size={16} aria-hidden="true" />}
          label={current}
          onClick={onCopy}
          disabled={disabled}
          size={size}
          variant={VARIANT[resolved] || 'ghost'}
          data-ui="copy-button.trigger"
        />
      </Tooltip>
    </span>
  )
}
