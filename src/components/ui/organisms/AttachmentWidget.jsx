import { useState } from 'react'
import { Paperclip, Upload, X, ArrowLeft, Trash2 } from 'lucide-react'
import CaptureWidget from '../molecules/CaptureWidget.jsx'
import DropZone from '../molecules/DropZone.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Button from '../atoms/Button.jsx'
import Link from '../atoms/Link.jsx'

/**
 * AttachmentWidget — GF-373 V2 Organism (05.30 Widgets). Anhänge einer Entität in der
 * Terminal-Token-Sprache (EntityDetail V2): komponiert die randlose `CaptureWidget`-Shell
 * mit einer Anhang-Liste im body und einem Upload-IconButton im create-Slot; Drag&Drop via
 * `DropZone`. Klick auf einen Anhang schaltet den body auf eine In-Frame-Preview-Pane um
 * (`selectedKey`, D04) mit Zurück/Öffnen/Löschen — KEIN Modal (Inline-Vision, PO 2026-06-19).
 *
 * Präsentational/controlled: `attachments` + Callbacks (`onUpload`/`onPick`/`onRemove`) vom
 * Consumer; `selectedKey` ist ephemerer UI-State (intern, wie DoDWidget.formOpen). Titellos
 * (Titel zentral im Accordion-Slot, D02). Mono, 0 Roh-Hex, Atome statt roher Primitive (L2).
 *
 * data-ui: Wurzel `<scope>` (default `attachment-widget`); CaptureShell `<scope>.capture`;
 * Liste `.list` + je Item `.item-<key>`/`.item-<key>.open`/`.item-<key>.remove`; DropZone
 * `.dropzone`; create-Slot `.upload`; Preview `.preview` + `.preview.back/.title/.image|.meta/
 * .open/.remove`; Leer `.empty-hint`.
 *
 * @param {object} props
 * @param {Array<{key:string, name:import('react').ReactNode, size?:string, href?:string, kind?:'image'|'file', previewUrl?:string}>} [props.attachments]
 * @param {boolean} [props.uploadable=false] - DropZone + Upload-Button einblenden.
 * @param {boolean} [props.removable=false] - Entfernen-Trigger je Item + in der Preview.
 * @param {(files:FileList)=>void} [props.onUpload] - Drop + Picker.
 * @param {()=>void} [props.onPick] - Klick-Picker (File-Dialog beim Consumer, mobile).
 * @param {(key:string)=>void} [props.onRemove]
 * @param {import('react').ReactNode} [props.emptyHint='Keine Anhänge.']
 * @param {boolean} [props.framed=false] - Rahmen (Standalone); im Accordion-Slot randlos.
 * @param {'s'|'m'|'l'} [props.dropzoneSize='m'] - DropZone-Größe (Composer komponiert `s`).
 * @param {import('react').ReactNode} [props.toolbarLabel] - Label LINKS in der Toolbar-Zeile
 *        (Composer reicht hier sein Sektions-CommentLabel ein, statt es als Header darüber zu setzen).
 * @param {string} [props.dataUiScope='attachment-widget']
 * @param {string} [props.className]
 */
export default function AttachmentWidget({
  attachments = [],
  uploadable = false,
  removable = false,
  onUpload,
  onPick,
  onRemove,
  emptyHint = 'Keine Anhänge.',
  framed = false,
  dropzoneSize = 'm',
  toolbarLabel,
  dataUiScope = 'attachment-widget',
  className = '',
  ...rest
}) {
  const dropIconSize = dropzoneSize === 's' ? 14 : 18
  const [selectedKey, setSelectedKey] = useState(null)
  const selected = attachments.find((a) => a.key === selectedKey)

  const remove = (key) => {
    onRemove?.(key)
    if (key === selectedKey) setSelectedKey(null)
  }

  const uploadBtn = uploadable ? (
    <IconButton
      icon={<Upload size={16} aria-hidden="true" />}
      label="Datei hochladen"
      onClick={onPick}
      size="sm"
      variant="ghost"
      reveal
      data-ui={`${dataUiScope}.upload`}
    />
  ) : undefined

  return (
    <div data-ui={dataUiScope} className={`[font-family:var(--font-display)] ${className}`} {...rest}>
      <CaptureWidget dataUiScope={`${dataUiScope}.capture`} framed={framed} toolbarLabelSlot={toolbarLabel} createSlot={selected ? undefined : uploadBtn}>
        {selected ? (
          <div data-ui={`${dataUiScope}.preview`} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <IconButton
                icon={<ArrowLeft size={14} aria-hidden="true" />}
                label="Zurück zur Liste"
                onClick={() => setSelectedKey(null)}
                size="sm"
                variant="ghost"
                data-ui={`${dataUiScope}.preview.back`}
              />
              <span data-ui={`${dataUiScope}.preview.title`} className="min-w-0 flex-1 truncate text-[13px] text-[var(--text)]">
                {selected.name}
              </span>
              {selected.href && (
                <Link href={selected.href} external variant="muted" className="text-[11px]" data-ui={`${dataUiScope}.preview.open`}>
                  Öffnen
                </Link>
              )}
              {removable && (
                <IconButton
                  icon={<Trash2 size={14} aria-hidden="true" />}
                  label={`${typeof selected.name === 'string' ? selected.name : selected.key} löschen`}
                  onClick={() => remove(selected.key)}
                  size="sm"
                  variant="danger"
                  data-ui={`${dataUiScope}.preview.remove`}
                />
              )}
            </div>
            {selected.kind === 'image' && selected.previewUrl ? (
              <img
                data-ui={`${dataUiScope}.preview.image`}
                src={selected.previewUrl}
                alt={typeof selected.name === 'string' ? selected.name : ''}
                className="max-h-64 w-auto self-start rounded-[var(--radius-sm)] border border-[var(--border-elevated)]"
              />
            ) : (
              <div
                data-ui={`${dataUiScope}.preview.meta`}
                className="rounded-[var(--radius-sm)] border border-[var(--border-elevated)] p-3 text-[12px] text-[var(--subtext0)]"
              >
                <div className="flex items-center gap-2">
                  <Paperclip size={14} aria-hidden="true" />
                  <span className="text-[var(--text)]">{selected.name}</span>
                </div>
                {selected.size && <div className="mt-1 tabular-nums">{selected.size}</div>}
              </div>
            )}
          </div>
        ) : attachments.length === 0 ? (
          <p data-ui={`${dataUiScope}.empty-hint`} className="text-[12px] text-[var(--subtext0)]">
            {emptyHint}
          </p>
        ) : (
          <ul data-ui={`${dataUiScope}.list`} className="m-0 flex list-none flex-col gap-1 p-0">
            {attachments.map((att) => (
              <li
                key={att.key}
                data-ui={`${dataUiScope}.item-${att.key}`}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5"
              >
                <Paperclip size={14} aria-hidden="true" className="shrink-0 text-[var(--subtext0)]" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedKey(att.key)}
                  className="min-w-0 flex-1 !justify-start truncate !px-1 text-[12px] [font-family:var(--font-display)]"
                  data-ui={`${dataUiScope}.item-${att.key}.open`}
                >
                  {att.name}
                </Button>
                {att.size && <span className="shrink-0 text-[11px] tabular-nums text-[var(--subtext0)]">{att.size}</span>}
                {removable && (
                  <IconButton
                    icon={<X size={14} aria-hidden="true" />}
                    label={`${typeof att.name === 'string' ? att.name : att.key} entfernen`}
                    onClick={() => remove(att.key)}
                    size="sm"
                    variant="ghost"
                    reveal
                    data-ui={`${dataUiScope}.item-${att.key}.remove`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {uploadable && !selected && (
          <DropZone
            data-ui={`${dataUiScope}.dropzone`}
            onFiles={onUpload}
            onActivate={onPick}
            size={dropzoneSize}
            icon={<Upload size={dropIconSize} aria-hidden="true" />}
            label="Dateien hierher ziehen oder klicken"
          />
        )}
      </CaptureWidget>
    </div>
  )
}
