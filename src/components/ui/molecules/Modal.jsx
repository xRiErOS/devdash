import { useEffect, useRef } from 'react'

/**
 * Modal — DD#61 Atom. Token-saubere Dialog-Wrapper-Primitive (harvested aus
 * ui/Modal.jsx, DD-451). Backdrop + zentriertes Panel + ESC-Close + Focus-Anker
 * + role=dialog EINMAL zentral. Props-driven, kein Store, keine Domänen-Logik.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {React.ReactNode} [props.title] - Header-Titel (weggelassen → headerless)
 * @param {() => void} props.onClose
 * @param {React.ReactNode} [props.footer] - Action-Bar-Slot
 * @param {React.ReactNode} [props.headerActions] - Buttons/Extras rechts im Header
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {'center'|'top'} [props.align='center'] - top = pt-24 (Command-Palette)
 * @param {boolean} [props.headerless=false] - kein Header-Frame (children trägt eigenen Header)
 * @param {boolean} [props.busy=false] - blockt ESC + Backdrop-Close während Submit
 * @param {boolean} [props.manageEscape=true] - false → children besitzt ESC selbst
 * @param {boolean} [props.blurBackdrop=false] - backdrop-blur auf das Panel
 * @param {string} [props.labelledById] - aria-labelledby statt aria-label
 * @param {boolean} [props.padded=true] - Body-Padding (false → children steuert eigenes Padding)
 * @param {boolean} [props.fade=false] - devd-anim-fade auf das Panel (visuelle Parität)
 * @param {boolean} [props.autoFocus=true] - Panel beim Öffnen fokussieren. false →
 *   children behält den Fokus (z.B. autoFocus-Input). Wichtig: ohne dies stiehlt
 *   der Panel-Focus den Fokus vom autoFocus-Feld; das verschiebt activeElement vom
 *   <input> auf das Panel-<div> und hebelt den isInForm()-Guard globaler
 *   Single-Key-Shortcuts aus (DD-453).
 * @param {string} [props.dialogDataUi] - data-ui am Panel (Override)
 * @param {string} [props.backdropDataUi] - data-ui am Backdrop (Override)
 * @param {string} [props.dialogTestId] - data-testid am Panel (umschliesst Body+Footer)
 * @param {React.ReactNode} [props.children]
 */
const MAX_W = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[760px]',
  xl: 'max-w-[min(1100px,95vw)]',
}

const ALIGN = {
  center: 'items-center',
  top: 'items-start pt-24',
}

export default function Modal({
  open,
  title,
  onClose,
  footer,
  headerActions,
  size = 'md',
  align = 'center',
  headerless = false,
  busy = false,
  manageEscape = true,
  blurBackdrop = false,
  labelledById,
  padded = true,
  fade = false,
  autoFocus = true,
  dialogDataUi,
  backdropDataUi,
  dialogTestId,
  children,
}) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    if (autoFocus) ref.current?.focus()
    // A11Y-B02/B03 (W0-T15): zentraler Focus-Trap. Tab/Shift+Tab zyklisch INNERHALB des
    // Dialogs halten (deckt alle modalen Forms inkl. Sprint-Edit). ESC-Close bleibt an
    // manageEscape gebunden (children kann ESC selbst besitzen). Läuft nur clientseitig.
    const onKey = (e) => {
      if (manageEscape && e.key === 'Escape' && !busy) { onClose?.(); return }
      if (e.key !== 'Tab') return
      const panel = ref.current
      if (!panel) return
      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) { e.preventDefault(); panel.focus(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || active === panel) { e.preventDefault(); last.focus() }
      } else if (active === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, busy, manageEscape, autoFocus])

  if (!open) return null

  const requestClose = () => { if (!busy) onClose?.() }

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center p-4 ${ALIGN[align] || ALIGN.center} bg-[color-mix(in_srgb,var(--crust)_70%,transparent)]`}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose() }}
      data-ui={backdropDataUi || 'modal.backdrop'}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={labelledById ? undefined : title}
        aria-labelledby={labelledById}
        className={`w-full ${MAX_W[size] || MAX_W.md} rounded-lg outline-none flex flex-col max-h-[90vh] bg-[var(--surface0)] border border-[var(--surface1)]${fade ? ' devd-anim-fade' : ''}${blurBackdrop ? ' backdrop-blur-[2px]' : ''}`}
        data-ui={dialogDataUi || 'modal.dialog'}
        data-testid={dialogTestId}
      >
        {!headerless && (title || headerActions) && (
          <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-[var(--surface1)]" data-ui="modal.header">
            {title && <h2 className="font-medium text-[var(--text)]" data-ui="modal.title">{title}</h2>}
            {headerActions && <div className="flex items-center gap-1" data-ui="modal.header-actions">{headerActions}</div>}
          </div>
        )}
        <div className={`${padded ? 'px-4 py-3 ' : ''}overflow-y-auto text-[var(--text)]`} data-ui="modal.body">{children}</div>
        {footer && (
          <div className="px-4 py-3 flex justify-end gap-2 border-t border-[var(--surface1)]" data-ui="modal.footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
