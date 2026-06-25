import Modal from './molecules/Modal.jsx'

/**
 * FormPage — Archetyp-Organismus (DD-426). Eine Schablone, drei Ausprägungen
 * über `variant`. Schreibt die Form-Komposition vor: `sections`-Slot trägt
 * die Felder, `actionBar`-Slot sitzt immer an konsistenter Kante (Footer).
 * Ab Plan 08 rasten Form-Views nur noch in diese Slots ein (Recompose).
 *
 * Drei Ausprägungen (variant):
 *  - 'classic'  → vollseitige Form: Header (title/actions) + sections + sticky
 *                 Footer-ActionBar. PageShell-naher Rahmen.
 *  - 'settings' → SettingsPage: sections-Sektionen gestapelt, ActionBar als
 *                 konsistenter Footer.
 *  - 'modal'    → nutzt zentrales `ui/Modal` (Focus-Trap/ESC/Z-Index einmal),
 *                 sections im scrollbaren Body, actionBar als Modal-Footer.
 *
 * Slot-Vertrag (verbindlich):
 *  - sections  (ReactNode) → Formularinhalt (Felder/Sektionen). Pflicht-Slot.
 *  - actionBar (ReactNode) → Aktionsleiste (Submit/Cancel) an konsistenter Kante.
 *
 * @param {object} props
 * @param {'classic'|'settings'|'modal'} [props.variant='classic'] - Ausprägung der Schablone
 * @param {React.ReactNode} props.sections - Formularinhalt (Pflicht-Slot)
 * @param {React.ReactNode} [props.actionBar] - Aktionsleiste (Footer-Kante)
 * @param {string} [props.title] - Überschrift (Header bzw. Modal-Titel)
 * @param {React.ReactNode} [props.actions] - rechtsbündige Header-Aktionen (classic/settings)
 * @param {boolean} [props.open=true] - nur variant='modal': Sichtbarkeit
 * @param {() => void} [props.onClose] - nur variant='modal': Schließen-Handler
 * @param {'sm'|'md'|'lg'} [props.size='md'] - nur variant='modal': Panel-Breite
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Element (classic/settings)
 * @param {string} [props['data-ui']] - optionales Test/Tracking-Hook, durchgereicht
 */
export default function FormPage({
  variant = 'classic',
  sections,
  actionBar,
  title,
  actions,
  open = true,
  onClose,
  size = 'md',
  className = '',
  ...rest
}) {
  const dataUi = rest['data-ui']

  if (variant === 'modal') {
    return (
      <Modal open={open} title={title} onClose={onClose} size={size} footer={actionBar}>
        <div className="flex flex-col gap-4" data-ui={dataUi} data-formpage-variant="modal">
          {sections}
        </div>
      </Modal>
    )
  }

  const isSettings = variant === 'settings'
  const sectionGap = isSettings ? 'gap-5' : 'gap-4'

  return (
    <div
      className={`flex flex-col rounded-lg overflow-hidden bg-[var(--mantle)] border border-[var(--surface0)] ${className}`}
      data-ui={dataUi}
      data-formpage-variant={variant}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--surface0)] bg-[var(--base)]">
          {title && <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className={`flex flex-col ${sectionGap} p-5`} data-formpage-slot="sections">
        {sections}
      </div>

      {actionBar && (
        <div
          className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[var(--surface0)] bg-[var(--mantle)]"
          data-formpage-slot="actionBar"
        >
          {actionBar}
        </div>
      )}
    </div>
  )
}
