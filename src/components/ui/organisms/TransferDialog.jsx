import { useState } from 'react'
import { Download } from 'lucide-react'
import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Button from '../atoms/Button.jsx'
import CopyButton from '../molecules/CopyButton.jsx'

/**
 * GF-250 — TransferDialog (Organism, 05.60 Overlay, OR-11). Overlay zum Kopieren/
 * Exportieren der (gefilterten) Liste: Format-Auswahl (MD/CSV/JSON) + Vorschau +
 * Copy-to-Clipboard (CopyButton, GF-237) + Download. Stateful nur bzgl. der
 * Format-Selektion — dumb bzgl. Daten (die serialisierten Strings kommen als Props).
 *
 * Ebene-6 (OR-11) — Gegencheck (sprint-04: keine gemined Cap → bei Bau prüfen):
 * Export-Capability ist PRESENT, KEINE Coverage-Lücke — GET /api/sprints/:id/export
 * (server/api.js:3418) + GET /api/backlog-export (:3485) liefern md/csv; MCP
 * `devd_backlog_export`. JSON ist im UI-Vertrag mitgeführt (Consumer serialisiert).
 * Clipboard-Write + Datei-Download macht der Consumer (CONV-molecule-boundary analog).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {{md?:string,csv?:string,json?:string}} [props.previews={}] - serialisierte Vorschau je Format.
 * @param {{format:'md'|'csv'|'json'}} [props.value] - initiales Format.
 * @param {'idle'|'success'|'error'} [props.copyState='idle']
 * @param {(format:'md'|'csv'|'json')=>void} [props.onCopy]
 * @param {(format:'md'|'csv'|'json')=>void} [props.onDownload]
 */
const FORMATS = [
  { value: 'md', label: 'Markdown' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
]

export default function TransferDialog({
  open,
  onClose,
  previews = {},
  value,
  copyState = 'idle',
  onCopy,
  onDownload,
}) {
  const [format, setFormat] = useState(value?.format ?? 'md')
  const preview = previews[format] ?? ''

  return (
    <Modal open={open} onClose={onClose} headerless size="md" padded={false} dialogDataUi="organism.transfer-dialog">
      <DialogHeader title="Exportieren" onClose={onClose} data-ui="organism.transfer-dialog.header" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex gap-2" role="tablist" aria-label="Exportformat">
          {FORMATS.map((f) => (
            <Button
              key={f.value}
              data-ui={`organism.transfer-dialog.format-${f.value}`}
              variant={format === f.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFormat(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <pre
          data-ui="organism.transfer-dialog.preview"
          className="max-h-64 overflow-auto rounded-md border border-[var(--surface1)] bg-[var(--surface0)] p-3 text-xs text-[var(--subtext0)]"
        >
          <code>{preview}</code>
        </pre>
      </div>
      <DialogFooter align="between">
        <span data-ui="organism.transfer-dialog.copy">
          <CopyButton state={copyState} onCopy={() => onCopy?.(format)} label="Kopieren" />
        </span>
        <Button
          variant="primary"
          data-ui="organism.transfer-dialog.download"
          leadingIcon={<Download size={14} aria-hidden="true" />}
          onClick={() => onDownload?.(format)}
        >
          Herunterladen
        </Button>
      </DialogFooter>
    </Modal>
  )
}
