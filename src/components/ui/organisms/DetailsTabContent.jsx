/**
 * DetailsTabContent — kanonisches, token-sauberes Organism (DD-481 Phase 3
 * Batch 4, Harvest aus src/components/itemDetail/DetailsTabContent.jsx).
 *
 * Domänen-bewusste Einheit: rendert den vollständigen Issue-Detail-Tab —
 * die Sektionen Beschreibung (Goal/Background), Description (Legacy),
 * Acceptance Criteria, Context Notes, Relevant Files, PO-Notizen (mit
 * Attachment-Upload/Galerie), Testinstruktion, Result und Meta. Komponiert
 * das EditableSection-Organism (Read-/Edit-Umschaltung je Sektion), das
 * MarkdownField-Molecule, das AttachmentDropzone-Molecule (+ AttachmentGallery)
 * und das MetaBlock-Atom (Meta-Audit-Felder).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle rief in der PO-Notizen-Sektion `fetch('/api/backlog/:id/attachments',
 *    POST FormData)` (Upload) und `fetch('/api/attachments/:id', DELETE)`
 *    (Entfernen) direkt auf und mutierte den Attachments-State via `setAttachments`.
 *    Beide Mutationen sind hier zu Callback-Props gehoben: `onUpload(files)` und
 *    `onRemoveAttachment(attachment)`. Der Konsument führt die API-Calls aus und
 *    pflegt `attachments`/`uploading` selbst.
 *  - Der Relevant-Files-Picker der Quelle (`RelevantFilesPicker`) lädt per
 *    `fetch('/api/projects/:id/files')` eine Autocomplete-Liste — diese
 *    API-Kopplung wird NICHT in die Library gezogen. Stattdessen sind Read- und
 *    Edit-Body der Files-Sektion als optionale Render-Slots gehoben
 *    (`renderFilesRead` / `renderFilesEdit`); der Konsument injiziert den
 *    fetch-gekoppelten Picker, der Default ist eine token-cleane Chip-Liste.
 *  - `renderMarkdown` (Quelle nutzte `dangerouslySetInnerHTML`) ist als
 *    `renderMarkdown`-Prop gehoben (Default: Plain-Text), damit die Library
 *    keine markdown.js-Kopplung trägt; HTML-Render bleibt opt-in beim Konsumenten.
 *
 * Ephemerer UI-State: keiner — Edit-/Draft-/Saving-/Error-State der Sektionen
 * wird vom Parent über `sectionState` + die Section-Callbacks verwaltet
 * (gleiche Hoheits-Aufteilung wie in der Quelle).
 *
 * @param {object} props
 * @param {object} props.item - Issue-Datensatz (goal, background, description,
 *        context_notes, files?, po_notes, result, status, created_at, refined_at,
 *        completed_at, created_by_user, plugin_key). E01/D09: acceptance_criteria +
 *        test_instruction abgeloest durch user_stories[].qa.
 * @param {object} props.sectionState - pro-Sektion-State, Keys: desc, description,
 *        context, files, po, result — je { editing, saving, error, draft }
 * @param {(key:string, draft:object)=>void} props.startSection - Edit-Modus starten
 * @param {(key:string)=>void} props.cancelSection - Edit abbrechen
 * @param {(key:string, patch:object)=>void} props.updateSectionDraft - Draft patchen
 * @param {(key:string)=>void} props.saveSection - Sektion speichern
 * @param {Array<object>} [props.attachments=[]] - Anhänge der PO-Notizen-Galerie
 * @param {boolean} [props.uploading=false] - Upload in-flight (Dropzone-Label)
 * @param {(files:File[])=>void} [props.onUpload] - Upload-Mutation (gehoben)
 * @param {(attachment:object)=>void} [props.onRemoveAttachment] - Remove-Mutation (gehoben)
 * @param {(md:string)=>string} [props.renderMarkdown] - Markdown→HTML-Renderer (opt-in)
 * @param {(files:Array<object>)=>import('react').ReactNode} [props.renderFilesRead] - Read-Body Relevant Files
 * @param {(draftFiles:string[], onChange:(arr:string[])=>void)=>import('react').ReactNode} [props.renderFilesEdit] - Edit-Body Relevant Files
 * @param {string} [props.dataUiScope='details-tab-content'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import EditableSection from './EditableSection.jsx'
import MarkdownField from '../molecules/MarkdownField.jsx'
import AttachmentDropzone, { AttachmentGallery } from '../molecules/AttachmentDropzone.jsx'
import MetaBlock from '../atoms/MetaBlock.jsx'

// Meta-Audit-Felder als statische Map (label → item-Key), kein String-Interpolation.
const META_FIELDS = [
  { label: 'Erstellt', key: 'created_at' },
  { label: 'Refined', key: 'refined_at' },
  { label: 'Done/Closed', key: 'completed_at' },
  { label: 'Erstellt durch', key: 'created_by_user' },
  { label: 'Plugin Key', key: 'plugin_key' },
]

// Read-Body: Markdown-gerenderter Wert oder Em-Dash-Platzhalter.
function MdValue({ value, render, dataUi }) {
  if (!value) {
    return <p data-ui={dataUi} className="text-sm text-[var(--subtext1)]">—</p>
  }
  if (render) {
    return (
      <div
        data-ui={dataUi}
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: render(value) }}
      />
    )
  }
  return <div data-ui={dataUi} className="text-sm whitespace-pre-wrap">{value}</div>
}

export default function DetailsTabContent({
  item,
  sectionState,
  startSection,
  cancelSection,
  updateSectionDraft,
  saveSection,
  attachments = [],
  uploading = false,
  onUpload,
  onRemoveAttachment,
  renderMarkdown,
  renderFilesRead,
  renderFilesEdit,
  dataUiScope = 'details-tab-content',
}) {
  const desc = sectionState.desc
  const ctx = sectionState.context
  const files = sectionState.files
  const po = sectionState.po
  const description = sectionState.description
  const result = sectionState.result

  const itemFiles = item.files || []

  return (
    <div data-ui={dataUiScope}>
      {/* Section: Beschreibung (Goal + Background als Block, DD-127) */}
      <EditableSection
        title="Beschreibung"
        dataUiScope={`${dataUiScope}.beschreibung`}
        editing={desc.editing}
        onStartEdit={() => startSection('desc', { goal: item.goal || '', background: item.background || '' })}
        onSave={() => saveSection('desc')}
        onCancel={() => cancelSection('desc')}
        saving={desc.saving}
        error={desc.error}
        renderEdit={() => desc.draft && (
          <div className="space-y-3">
            <div data-ui={`${dataUiScope}.beschreibung.goal-input`}>
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">Goal</label>
              <MarkdownField
                value={desc.draft.goal}
                onChange={v => updateSectionDraft('desc', { goal: v })}
                rows={3}
              />
            </div>
            <div data-ui={`${dataUiScope}.beschreibung.background-input`}>
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">Background</label>
              <MarkdownField
                value={desc.draft.background}
                onChange={v => updateSectionDraft('desc', { background: v })}
                rows={3}
              />
            </div>
          </div>
        )}
      >
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold mb-1 text-[var(--subtext0)]">Goal</h4>
            <MdValue value={item.goal} render={renderMarkdown} dataUi={`${dataUiScope}.beschreibung.goal`} />
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-1 text-[var(--subtext0)]">Background</h4>
            <MdValue value={item.background} render={renderMarkdown} dataUi={`${dataUiScope}.beschreibung.background`} />
          </div>
        </div>
      </EditableSection>

      {/* DD-45 D30: description bleibt als Legacy-Capture-Feld sichtbar und editierbar. */}
      <EditableSection
        title="Description (Legacy)"
        dataUiScope={`${dataUiScope}.description`}
        indicator={
          <span className="text-[10px] normal-case text-[var(--subtext1)]">
            Soft-deprecated — bevorzugt goal/background nutzen
          </span>
        }
        editing={description.editing}
        onStartEdit={() => startSection('description', { description: item.description || '' })}
        onSave={() => saveSection('description')}
        onCancel={() => cancelSection('description')}
        saving={description.saving}
        error={description.error}
        renderEdit={() => description.draft && (
          <MarkdownField
            value={description.draft.description}
            onChange={(v) => updateSectionDraft('description', { description: v })}
            rows={4}
            placeholder="Freitext-Capture. Strukturierter Inhalt gehoert in goal/background/user_stories."
          />
        )}
      >
        <MdValue value={item.description} render={renderMarkdown} dataUi={`${dataUiScope}.description.value`} />
      </EditableSection>

      {/* Section: Context Notes (KI-Brief, DD-127) */}
      <EditableSection
        title="Context Notes (KI-Brief)"
        dataUiScope={`${dataUiScope}.context`}
        editing={ctx.editing}
        onStartEdit={() => startSection('context', { context_notes: item.context_notes || '' })}
        onSave={() => saveSection('context')}
        onCancel={() => cancelSection('context')}
        saving={ctx.saving}
        error={ctx.error}
        renderEdit={() => ctx.draft && (
          <MarkdownField
            value={ctx.draft.context_notes}
            onChange={(v) => updateSectionDraft('context', { context_notes: v })}
            rows={8}
            placeholder="Zusätzlicher Kontext für den KI-Agenten — Markdown wird unterstützt."
          />
        )}
      >
        <MdValue value={item.context_notes} render={renderMarkdown} dataUi={`${dataUiScope}.context.value`} />
      </EditableSection>

      {/* Section: Relevant Files (DD-130 Chip-Liste) */}
      <EditableSection
        title="Relevant Files"
        dataUiScope={`${dataUiScope}.files`}
        editing={files.editing}
        onStartEdit={() => startSection('files', { files: itemFiles.map(f => f.path) })}
        onSave={() => saveSection('files')}
        onCancel={() => cancelSection('files')}
        saving={files.saving}
        error={files.error}
        renderEdit={() => files.draft && (
          renderFilesEdit
            ? renderFilesEdit(files.draft.files, (arr) => updateSectionDraft('files', { files: arr }))
            : (
              <div data-ui={`${dataUiScope}.files.edit`} className="flex gap-1.5 flex-wrap">
                {(files.draft.files || []).map((path) => (
                  <span
                    key={path}
                    data-ui={`${dataUiScope}.files.chip`}
                    className="text-[11px] font-mono px-2 py-1 rounded bg-[var(--surface1)] text-[var(--subtext1)]"
                  >
                    {path}
                  </span>
                ))}
              </div>
            )
        )}
      >
        {itemFiles.length === 0
          ? <p data-ui={`${dataUiScope}.files.empty`} className="text-sm text-[var(--subtext1)]">—</p>
          : (renderFilesRead
              ? renderFilesRead(itemFiles)
              : (
                <div data-ui={`${dataUiScope}.files.read`} className="flex gap-1.5 flex-wrap">
                  {itemFiles.map((f) => (
                    <span
                      key={f.path}
                      data-ui={`${dataUiScope}.files.chip`}
                      className="text-[11px] font-mono px-2 py-1 rounded bg-[var(--surface1)] text-[var(--subtext1)]"
                    >
                      {f.path}
                    </span>
                  ))}
                </div>
              ))}
      </EditableSection>

      {/* DD-128: Section: PO-Notizen — Input vom PO für Refinement. */}
      <EditableSection
        title="PO-Notizen"
        dataUiScope={`${dataUiScope}.po`}
        indicator={
          <span className="text-[10px] normal-case text-[var(--subtext1)]">
            Input vom PO — relevant fürs Refinement
          </span>
        }
        editing={po.editing}
        onStartEdit={() => startSection('po', { po_notes: item.po_notes || '' })}
        onSave={() => saveSection('po')}
        onCancel={() => cancelSection('po')}
        saving={po.saving}
        error={po.error}
        renderEdit={() => po.draft && (
          <>
            <MarkdownField
              value={po.draft.po_notes}
              onChange={(v) => updateSectionDraft('po', { po_notes: v })}
              rows={5}
              placeholder="Erwartungen, Hinweise, Erläuterungen zu Screenshots — Input fürs Refinement."
            />
            <div className="mt-3">
              <AttachmentDropzone
                data-ui={`${dataUiScope}.po.dropzone`}
                label={uploading ? 'Lade hoch…' : 'Bild ablegen, einfügen (cmd+v) oder klicken'}
                onFiles={(filesArr) => onUpload?.(filesArr)}
              />
              <AttachmentGallery
                attachments={attachments}
                onRemove={(a) => onRemoveAttachment?.(a)}
              />
            </div>
          </>
        )}
      >
        <MdValue value={item.po_notes} render={renderMarkdown} dataUi={`${dataUiScope}.po.value`} />
        {attachments.length > 0 && (
          <div className="mt-3">
            <AttachmentGallery attachments={attachments} onRemove={(a) => onRemoveAttachment?.(a)} />
          </div>
        )}
      </EditableSection>

      {/* DD-45 R05: result-Feld — Coding-Outcome fuer Sprint-Complete-Guard. */}
      <EditableSection
        title="Result"
        dataUiScope={`${dataUiScope}.result`}
        indicator={
          <span className="text-[10px] normal-case text-[var(--subtext1)]">
            Outcome — Pflicht fuer Sprint Complete
          </span>
        }
        editing={result.editing}
        onStartEdit={() => startSection('result', { result: item.result || '' })}
        onSave={() => saveSection('result')}
        onCancel={() => cancelSection('result')}
        saving={result.saving}
        error={result.error}
        renderEdit={() => result.draft && (
          <MarkdownField
            value={result.draft.result}
            onChange={(v) => updateSectionDraft('result', { result: v })}
            rows={8}
            placeholder="YAML/Markdown — outcome_summary, files_changed, commits, lessons_learned, related_issues."
          />
        )}
      >
        <MdValue value={item.result} render={renderMarkdown} dataUi={`${dataUiScope}.result.value`} />
      </EditableSection>

      {/* DD-45 R05: Meta-Felder — Audit-Zeitpunkte und created_by_user.
          MetaBlock-Atom je Audit-Feld (Label/Value-Slot), 2-spaltiges Grid. */}
      <EditableSection title="Meta" dataUiScope={`${dataUiScope}.meta`} indicator={null}>
        <div data-ui={`${dataUiScope}.meta.list`} className="grid grid-cols-2 gap-x-4">
          {META_FIELDS.map(({ label, key }) => (
            <MetaBlock key={key} label={label} value={item[key] || '—'} />
          ))}
        </div>
      </EditableSection>
    </div>
  )
}
