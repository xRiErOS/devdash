/**
 * SopSlot — DD-518 Organism (presentational, props-driven).
 *
 * Rendert eine einzelne SOP als editierbaren Markdown-Slot: Read-Preview ↔ Edit
 * via MarkdownField (Molecule), Aktionsleiste Bearbeiten/Speichern/Abbrechen und
 * Saving-/Error-Feedback nach dem SstdCard-Muster.
 *
 * PRESENTATIONAL: kein fetch/Store/API. Der Konsument (views/GlobalSettings.jsx)
 * lädt den vollen `content` je SOP, führt den PUT /api/sops/:key-Call im
 * `onSave`-Callback aus und meldet `saving`/`error` als Props zurück.
 *
 * Read↔Edit-Umschaltung ist nach außen gehoben: `editing` (controlled) + `onEdit`
 * (Start) und `onCancel` (Verwerfen). Im Edit-Modus hält die Komponente einen
 * lokalen `draft`-State (Spiegel des content), den sie beim Eintritt in den
 * Edit-Modus aus `content` initialisiert. `onSave(draft)` reicht den editierten
 * Markdown an den Konsumenten.
 *
 * @param {object} props
 * @param {string} props.sopKey - stabiler SOP-Key (z.B. 'sprint-durchfuehrung')
 * @param {string} props.title - SOP-Titel (Card-Heading)
 * @param {string} [props.content=''] - aktueller Server-Markdown (Read-Quelle)
 * @param {boolean} [props.editing=false] - Edit-Modus aktiv (controlled)
 * @param {boolean} [props.saving=false] - Mutation in-flight → Aktionen disabled
 * @param {string} [props.error=''] - Fehlertext (Mutation fehlgeschlagen)
 * @param {string|null} [props.updatedAt=null] - ISO-Zeitstempel letzter Pflege
 * @param {boolean} [props.loadingContent=false] - voller Content wird nachgeladen
 * @param {()=>void} [props.onEdit] - Edit-Modus starten
 * @param {(nextContent:string)=>void} [props.onSave] - Speichern (editierter Markdown)
 * @param {()=>void} [props.onCancel] - Edit verwerfen
 * @param {string} [props.anchorId] - DD-599: DOM-id der Card (Sprungziel der SlotToc).
 * @param {()=>void} [props.onBackToNav] - DD-599 (D05): „↑ Navigation"-Anker über der
 *   Card → zurück zur TOC. Off → kein Anker.
 * @param {boolean} [props.clip=false] - DD-599 (D03): Read-Preview mobil (<768px) auf
 *   max-height 40vh clippen + Fade; Tap → Volltext-Fenster (onExpand).
 * @param {()=>void} [props.onExpand] - DD-599 (D04): Tap auf geclippte Preview → Fenster.
 * @param {boolean} [props.hideEditButton=false] - DD-599: Inline-„Bearbeiten" ausblenden
 *   (mobil editiert man im Volltext-Fenster).
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState, useEffect } from 'react'
import { FileText, Pencil, Check, X, ArrowUp } from 'lucide-react'
import Card from '../atoms/Card.jsx'
import Button from '../atoms/Button.jsx'
import Pill from '../atoms/Pill.jsx'
import Stack from '../layout/Stack.jsx'
import Cluster from '../layout/Cluster.jsx'
import MarkdownField from '../molecules/MarkdownField.jsx'

export default function SopSlot({
  sopKey,
  title,
  content = '',
  editing = false,
  saving = false,
  error = '',
  updatedAt = null,
  loadingContent = false,
  onEdit,
  onSave,
  onCancel,
  anchorId,
  onBackToNav,
  clip = false,
  onExpand,
  hideEditButton = false,
  className = '',
}) {
  const anchor = `global-settings.sop.${sopKey}`
  const navAnchor = `detail.slot-nav.slot.${sopKey}`

  // Ephemerer Editor-State: Spiegel des content, re-initialisiert sobald der
  // Edit-Modus betreten wird oder der Server-Content wechselt.
  const [draft, setDraft] = useState(content)
  useEffect(() => { if (editing) setDraft(content) }, [editing, content])

  return (
    <div>
      {/* DD-599 (D05): „↑ Navigation"-Anker linksbündig über der Card → TOC. */}
      {onBackToNav && (
        <button
          type="button"
          onClick={onBackToNav}
          data-ui={`${navAnchor}.back-to-nav`}
          className="mb-1 flex items-center gap-1 text-[var(--subtext0)]"
        >
          <ArrowUp size={12} />
          <span className="text-[10px] uppercase tracking-wider">Navigation</span>
        </button>
      )}
      <Card tone="mantle" padding="md" id={anchorId} data-ui={anchor} className={`scroll-mt-4 ${className}`}>
      <Stack gap="sm">
        <Cluster justify="between" gap="sm" className="items-center">
          <Cluster gap="sm" className="items-center min-w-0">
            <FileText size={16} className="text-[var(--accent-primary)] shrink-0" />
            <h2 className="font-display text-sm font-bold truncate" data-ui={`${anchor}.title`}>{title}</h2>
            <Pill color="neutral" variant="ghost" data-ui={`${anchor}.key`}>{sopKey}</Pill>
          </Cluster>
          {editing ? (
            <Cluster gap="xs" className="shrink-0 flex-nowrap">
              <Button
                size="sm"
                variant="primary"
                loading={saving}
                disabled={saving}
                onClick={() => onSave?.(draft)}
                data-ui={`${anchor}.save`}
              >
                <Check size={14} />Speichern
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => onCancel?.()}
                data-ui={`${anchor}.cancel`}
              >
                <X size={14} />Abbrechen
              </Button>
            </Cluster>
          ) : (
            <Cluster gap="sm" className="shrink-0 items-center flex-nowrap">
              {updatedAt && (
                <span className="text-xs text-[var(--overlay0)]" data-ui={`${anchor}.updated-at`}>
                  {`zuletzt: ${String(updatedAt).replace('T', ' ').slice(0, 16)}`}
                </span>
              )}
              {!hideEditButton && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loadingContent}
                  onClick={() => onEdit?.()}
                  data-ui={`${anchor}.edit`}
                >
                  <Pencil size={14} />Bearbeiten
                </Button>
              )}
            </Cluster>
          )}
        </Cluster>

        {error && (
          <div data-ui={`${anchor}.error`} className="rounded-lg p-2 text-xs bg-[var(--surface0)] text-[var(--accent-danger)]">
            {error}
          </div>
        )}

        {editing ? (
          <MarkdownField
            value={draft}
            onChange={setDraft}
            mode="edit"
            rows={12}
            disabled={saving}
            className="font-mono"
            data-ui={`${anchor}.editor`}
          />
        ) : loadingContent ? (
          <p data-ui={`${anchor}.loading`} className="text-xs text-[var(--subtext0)]">Laden…</p>
        ) : clip ? (
          // DD-599 (D03/D04): mobil geclippte, antippbare Preview → Volltext-Fenster.
          <button
            type="button"
            onClick={onExpand}
            data-ui={`${navAnchor}.clip`}
            className="relative block w-full text-left"
          >
            <Card tone="base" padding="sm" data-ui={`${anchor}.preview`} className="max-md:max-h-[40vh] max-md:overflow-hidden">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--subtext1)]">{content}</pre>
            </Card>
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-10 max-md:block bg-gradient-to-t from-[var(--mantle)] to-transparent"
              aria-hidden="true"
            />
          </button>
        ) : (
          <Card tone="base" padding="sm" data-ui={`${anchor}.preview`}>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--subtext1)]">{content}</pre>
          </Card>
        )}
      </Stack>
      </Card>
    </div>
  )
}
