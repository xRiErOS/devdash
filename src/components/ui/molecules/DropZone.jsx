import { useState } from 'react'

/**
 * DropZone — Molecule (04.30 Action, GF-276 / ML-19, I06). Der geteilte Desktop-
 * Drag-Target-Frame: gestrichelte Fläche + Icon + Label + optionaler Hint. Ein
 * Baustein für OR-15 (AssignDropZone), OR-24 (AttachmentWidget), OR-26 (CaptureForm)
 * — statt 3× eigener Drag-Logik.
 *
 * Dumb-Molecule (CONV-molecule-boundary): das Drag-Plumbing (preventDefault +
 * rein-visueller over-State, D04) ist generische UI. Datei-Filter, Persistenz und
 * Upload (Domäne) liegen beim Consumer via `onFiles(FileList)` / `onActivate`.
 * Touch-Drop ist bewusst deferred (D09, Desktop-Fokus).
 *
 * @param {object} props
 * @param {(files: FileList) => void} [props.onFiles] - Drop-Callback (rohe FileList).
 * @param {() => void} [props.onActivate] - Klick/Enter/Space (z.B. File-Dialog öffnen).
 * @param {import('react').ReactNode} [props.icon] - Icon über dem Label.
 * @param {import('react').ReactNode} [props.label='Dateien hierher ziehen'] - Haupttext.
 * @param {import('react').ReactNode} [props.hint] - sekundärer Hinweistext.
 * @param {string} [props.ariaLabel] - aria-label des Targets (Default = label).
 * @param {boolean} [props.active] - erzwingt das over-Visual (controlled; sonst intern).
 * @param {boolean} [props.disabled=false]
 * @param {'ghost'|'filled'} [props.surface='ghost'] - Idle-Fläche: `ghost`=transparent
 *        (Default, Clean-Look, D03), `filled`=graue Fläche (`--surface0`, opt-in).
 * @param {'s'|'m'|'l'} [props.size='m'] - Skaliert Padding/Gap + Label-Textgröße. `s`
 *        (kompakt, Label 11px) für In-Composer-Einsatz; `m` Standalone-Default; `l` groß.
 *        Icon-Größe liefert der Consumer passend (z.B. 14 bei `s`, sonst 18).
 * @param {string} [props.data-ui='dropzone'] - Anker-Scope (D01, Parent-Prefix): der
 *        Root **und** die Sub-Anker (`${scope}.icon/.label/.hint`) werden daraus
 *        abgeleitet. Consumer übergibt z.B. `attachment-widget.dropzone`.
 * @param {string} [props.className]
 */
const SIZES = {
  s: { box: 'gap-1 px-3 py-3', label: 'text-[11px]' },
  m: { box: 'gap-2 px-4 py-6', label: 'text-sm' },
  l: { box: 'gap-3 px-6 py-8', label: 'text-base' },
}

export default function DropZone({
  onFiles,
  onActivate,
  icon,
  label = 'Dateien hierher ziehen',
  hint,
  ariaLabel,
  active,
  disabled = false,
  surface = 'ghost',
  size = 'm',
  'data-ui': dataUi = 'dropzone',
  className = '',
  ...rest
}) {
  const sz = SIZES[size] || SIZES.m
  const [over, setOver] = useState(false)
  const isOver = (active ?? over) && !disabled

  const stop = (e) => { e.preventDefault(); e.stopPropagation() }
  const onDragOver = (e) => { stop(e); if (!disabled && !over) setOver(true) }
  const onDragLeave = (e) => { stop(e); if (over) setOver(false) }
  const onDrop = (e) => {
    stop(e)
    setOver(false)
    if (!disabled && onFiles && e.dataTransfer?.files) onFiles(e.dataTransfer.files)
  }
  const activate = () => { if (!disabled) onActivate?.() }
  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate?.() }
  }

  const idleSurface = surface === 'filled' ? 'bg-[var(--surface0)]' : 'bg-transparent'
  const tone = isOver
    ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]'
    : `border-[var(--surface2)] ${idleSurface}`

  return (
    <div
      data-ui={dataUi}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel || (typeof label === 'string' ? label : 'Datei-Upload')}
      aria-disabled={disabled || undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={activate}
      onKeyDown={onKeyDown}
      className={`flex flex-col items-center justify-center rounded-[var(--radius-sm)] border-2 border-dashed text-center transition-colors [font-family:var(--font-display)] ${sz.box} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${tone} ${className}`}
      {...rest}
    >
      {icon && <span data-ui={`${dataUi}.icon`} className="inline-flex text-[var(--subtext0)]">{icon}</span>}
      <span data-ui={`${dataUi}.label`} className={`${sz.label} text-[var(--text)]`}>{label}</span>
      {hint && <span data-ui={`${dataUi}.hint`} className="text-xs text-[var(--subtext0)]">{hint}</span>}
    </div>
  )
}
