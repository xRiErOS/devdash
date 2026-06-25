import MarkdownField from '../MarkdownField.jsx'
import AttachmentDropzone, { AttachmentGallery } from '../AttachmentDropzone.jsx'
import RelevantFilesPicker from '../RelevantFilesPicker.jsx'
import EditableSection from '../ui/EditableSection.jsx'
import { renderMarkdown } from '../../lib/markdown.js'

export default function DetailsTabContent({ item, sectionState, startSection, cancelSection, updateSectionDraft, saveSection, attachments, setAttachments, uploading, setUploading, id, backlogId }) {
  const desc = sectionState.desc
  const acceptance = sectionState.acceptance
  const ctx = sectionState.context
  const files = sectionState.files
  const po = sectionState.po
  const test = sectionState.test
  const description = sectionState.description
  const result = sectionState.result
  // DD-319: Testinstruktion erst ab planned. Refinement-QA gehoert in acceptance_criteria.
  const testEditable = ['planned', 'in_progress', 'to_review', 'passed', 'done', 'rejected'].includes(item.status)
  const testLockedForRefinement = ['new', 'refined'].includes(item.status)

  return (
    <>
      {/* Section: Beschreibung (Goal + Background als Block, DD-127) */}
      <EditableSection
        title="Beschreibung"
        editing={desc.editing}
        onStartEdit={() => startSection('desc', { goal: item.goal || '', background: item.background || '' })}
        onSave={() => saveSection('desc')}
        onCancel={() => cancelSection('desc')}
        saving={desc.saving}
        error={desc.error}
        renderEdit={() => desc.draft && (
          <div className="space-y-3">
            <div data-ui="issue-detail.beschreibung.goal-input">
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">Goal</label>
              <MarkdownField
                value={desc.draft.goal}
                onChange={v => updateSectionDraft('desc', { goal: v })}
                rows={3}
              />
            </div>
            <div data-ui="issue-detail.beschreibung.background-input">
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
            <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--subtext0)' }}>Goal</h4>
            {item.goal
              ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.goal) }} />
              : <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>}
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--subtext0)' }}>Background</h4>
            {item.background
              ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.background) }} />
              : <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>}
          </div>
        </div>
      </EditableSection>

      {/* DD-45 D30: description bleibt als Legacy-Capture-Feld sichtbar und editierbar. */}
      <EditableSection
        title="Description (Legacy)"
        indicator={
          <span className="text-[10px] normal-case" style={{ color: 'var(--hint)' }}>
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
            placeholder="Freitext-Capture. Strukturierter Inhalt gehoert in goal/background/acceptance_criteria."
          />
        )}
      >
        {item.description
          ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.description) }} />
          : <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>}
      </EditableSection>

      <EditableSection
        title="Acceptance Criteria"
        indicator={
          <span className="text-[10px] normal-case" style={{ color: 'var(--hint)' }}>
            QA im Refinement
          </span>
        }
        editing={acceptance.editing}
        onStartEdit={() => startSection('acceptance', { acceptance_criteria: item.acceptance_criteria || '' })}
        onSave={() => saveSection('acceptance')}
        onCancel={() => cancelSection('acceptance')}
        saving={acceptance.saving}
        error={acceptance.error}
        renderEdit={() => acceptance.draft && (
          <MarkdownField
            value={acceptance.draft.acceptance_criteria}
            onChange={(v) => updateSectionDraft('acceptance', { acceptance_criteria: v })}
            rows={6}
            placeholder="Was kann der Nutzer konkret tun? Welche beobachtbaren Kriterien muessen erfuellt sein?"
          />
        )}
      >
        {item.acceptance_criteria
          ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.acceptance_criteria) }} />
          : <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>}
      </EditableSection>

      {/* Section: Context Notes (KI-Brief, DD-127) */}
      <EditableSection
        title="Context Notes (KI-Brief)"
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
        {item.context_notes
          ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.context_notes) }} />
          : <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>}
      </EditableSection>

      {/* Section: Relevant Files (DD-130 Chip-Liste) */}
      <EditableSection
        title="Relevant Files"
        editing={files.editing}
        onStartEdit={() => startSection('files', { files: (item.files || []).map(f => f.path) })}
        onSave={() => saveSection('files')}
        onCancel={() => cancelSection('files')}
        saving={files.saving}
        error={files.error}
        renderEdit={() => files.draft && (
          <RelevantFilesPicker
            files={files.draft.files}
            onChange={(arr) => updateSectionDraft('files', { files: arr })}
          />
        )}
      >
        {(item.files || []).length === 0
          ? <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>
          : <RelevantFilesPicker files={item.files} readOnly />}
      </EditableSection>

      {/* DD-128: Section: PO-Notizen — Input vom PO für Refinement (Erwartungen, Screenshots, Hinweise). */}
      <EditableSection
        title="PO-Notizen"
        indicator={
          <span className="text-[10px] normal-case" style={{ color: 'var(--hint)' }}>
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
                label={uploading ? 'Lade hoch…' : 'Bild ablegen, einfügen (cmd+v) oder klicken'}
                onFiles={async (filesArr) => {
                  if (!id) return
                  setUploading(true)
                  try {
                    const fd = new FormData()
                    for (const f of filesArr) fd.append('files', f)
                    const res = await fetch(`/api/backlog/${backlogId}/attachments`, { method: 'POST', body: fd })
                    if (res.ok) {
                      const created = await res.json()
                      setAttachments(prev => [...prev, ...created])
                    }
                  } finally { setUploading(false) }
                }}
              />
              <AttachmentGallery
                attachments={attachments}
                onRemove={async (a) => {
                  if (!a.id) return
                  const res = await fetch(`/api/attachments/${a.id}`, { method: 'DELETE' })
                  if (res.ok) setAttachments(prev => prev.filter(x => x.id !== a.id))
                }}
              />
            </div>
          </>
        )}
      >
        {item.po_notes
          ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.po_notes) }} />
          : <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>}
        {attachments.length > 0 && (
          <div className="mt-3">
            <AttachmentGallery attachments={attachments} onRemove={async (a) => {
              if (!a.id) return
              const res = await fetch(`/api/attachments/${a.id}`, { method: 'DELETE' })
              if (res.ok) setAttachments(prev => prev.filter(x => x.id !== a.id))
            }} />
          </div>
        )}
      </EditableSection>

      {/* DD-192: Testinstruktion. Vom Entwickler beim Abschluss / nach Fixing
          gepflegt, dem PO read-only in der Review-Ansicht angezeigt. */}
      <EditableSection
        title="Testinstruktion"
        indicator={
          <span className="text-[10px] normal-case" style={{ color: 'var(--hint)' }}>
            {testLockedForRefinement ? 'Verfuegbar ab Status planned' : 'Wie testet der PO dieses Issue?'}
          </span>
        }
        editing={test.editing}
        onStartEdit={testEditable ? () => startSection('test', { test_instruction: item.test_instruction || '' }) : undefined}
        onSave={() => saveSection('test')}
        onCancel={() => cancelSection('test')}
        saving={test.saving}
        error={test.error}
        renderEdit={() => test.draft && (
          <MarkdownField
            value={test.draft.test_instruction}
            onChange={(v) => updateSectionDraft('test', { test_instruction: v })}
            rows={4}
            placeholder="Konkrete Schritte / Erwartung — was soll der PO klicken, was muss passieren?"
          />
        )}
      >
        {item.test_instruction
          ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.test_instruction) }} />
          : (
            <p className="text-sm" style={{ color: 'var(--hint)' }}>
              {testEditable
                ? '— noch keine Testinstruktion. Klicke „Bearbeiten" zum Pflegen.'
                : 'Verfuegbar ab Status planned — fuer QA-Kriterien nutze Acceptance Criteria oben.'}
            </p>
          )}
        {testLockedForRefinement && (
          <p className="text-xs mt-2" style={{ color: 'var(--yellow)' }}>
            test_instruction ist fuer PO-Testschritte nach der Planung reserviert. Refinement-QA gehoert in Acceptance Criteria.
          </p>
        )}
      </EditableSection>

      {/* DD-45 R05: result-Feld — Coding-Outcome fuer Sprint-Complete-Guard. */}
      <EditableSection
        title="Result"
        indicator={
          <span className="text-[10px] normal-case" style={{ color: 'var(--hint)' }}>
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
        {item.result
          ? <div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.result) }} />
          : <p className="text-sm" style={{ color: 'var(--hint)' }}>—</p>}
      </EditableSection>

      {/* DD-45 R05: Meta-Felder — Audit-Zeitpunkte und created_by_user. */}
      <EditableSection title="Meta" indicator={null}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt style={{ color: 'var(--subtext0)' }}>Erstellt</dt>
          <dd style={{ color: 'var(--text)' }}>{item.created_at || '—'}</dd>
          <dt style={{ color: 'var(--subtext0)' }}>Refined</dt>
          <dd style={{ color: 'var(--text)' }}>{item.refined_at || '—'}</dd>
          <dt style={{ color: 'var(--subtext0)' }}>Done/Closed</dt>
          <dd style={{ color: 'var(--text)' }}>{item.completed_at || '—'}</dd>
          <dt style={{ color: 'var(--subtext0)' }}>Erstellt durch</dt>
          <dd style={{ color: 'var(--text)' }}>{item.created_by_user || '—'}</dd>
          <dt style={{ color: 'var(--subtext0)' }}>Plugin Key</dt>
          <dd style={{ color: 'var(--text)' }}>{item.plugin_key || '—'}</dd>
        </dl>
      </EditableSection>
    </>
  )
}
