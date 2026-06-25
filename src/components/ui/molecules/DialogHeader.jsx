import { X } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'

/**
 * DialogHeader — Molecule (04.60 Overlay, GF-243 / ML-18). Die Kopfzeile eines
 * Dialogs: Titel-Text (+ optionaler Subtitle) links, optionale Actions + ein
 * Close-IconButton rechts. Paart mit `ModalShell` (headerless-Modus) oder steht
 * standalone.
 *
 * Dumb-Molecule (CONV-molecule-boundary): reine Slots/Callbacks, kein State. Der
 * Close-Button erscheint nur, wenn `onClose` gesetzt ist.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.title - Titel-Text.
 * @param {import('react').ReactNode} [props.subtitle] - optionale Unterzeile.
 * @param {() => void} [props.onClose] - gesetzt → Close-IconButton sichtbar.
 * @param {string} [props.closeLabel='Schließen'] - aria-label des Close-Buttons.
 * @param {import('react').ReactNode} [props.actions] - Extra-Aktionen vor dem Close.
 * @param {string} [props.titleId] - id für aria-labelledby des Dialogs.
 * @param {string} [props.className]
 */
export default function DialogHeader({
  title,
  subtitle,
  onClose,
  closeLabel = 'Schließen',
  actions,
  titleId,
  className = '',
  ...rest
}) {
  return (
    <div
      data-ui="dialog-header"
      className={`flex items-start justify-between gap-3 border-b border-[var(--surface1)] px-4 py-3 ${className}`}
      {...rest}
    >
      <div className="min-w-0">
        <h2 id={titleId} data-ui="dialog-header.title" className="truncate font-medium text-[var(--text)]">{title}</h2>
        {subtitle && <p data-ui="dialog-header.subtitle" className="mt-0.5 text-xs text-[var(--subtext0)]">{subtitle}</p>}
      </div>
      {(actions || onClose) && (
        <div className="flex shrink-0 items-center gap-1">
          {actions && <span data-ui="dialog-header.actions" className="inline-flex items-center gap-1">{actions}</span>}
          {onClose && (
            <IconButton
              icon={<X size={16} aria-hidden="true" />}
              label={closeLabel}
              onClick={onClose}
              size="sm"
              variant="ghost"
              data-ui="dialog-header.close"
            />
          )}
        </div>
      )}
    </div>
  )
}
