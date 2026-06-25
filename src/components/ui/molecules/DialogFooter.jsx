/**
 * DialogFooter — Molecule (04.60 Overlay, GF-243 / ML-18). Die Aktionsleiste am
 * Fuß eines Dialogs: ein Button-Slot, per Default rechtsbündig. Paart mit
 * `ModalShell` (footer-Slot) oder steht standalone.
 *
 * Dumb-Molecule (CONV-molecule-boundary): reiner Slot, kein State. Die Buttons
 * (Atome) und ihre Callbacks bringt der Consumer mit.
 *
 * @param {object} props
 * @param {'end'|'between'|'start'} [props.align='end'] - horizontale Ausrichtung der Buttons.
 * @param {import('react').ReactNode} [props.children] - Button-Atome.
 * @param {string} [props.className]
 */
const ALIGN = {
  end: 'justify-end',
  between: 'justify-between',
  start: 'justify-start',
}

export default function DialogFooter({ align = 'end', children, className = '', ...rest }) {
  return (
    <div
      data-ui="dialog-footer"
      className={`flex items-center gap-2 border-t border-[var(--surface1)] px-4 py-3 ${ALIGN[align] || ALIGN.end} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
