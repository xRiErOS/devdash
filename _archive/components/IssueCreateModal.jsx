import React, { useState, useEffect, useCallback, useRef } from 'react'
import AttachmentDropzone, { AttachmentGallery } from './AttachmentDropzone.jsx'
import MarkdownField from './MarkdownField.jsx'
import TagMultiSelect from './TagMultiSelect.jsx'
import Select from './ui/molecules/Select.jsx'
import Modal from './ui/molecules/Modal.jsx'

// DD-451: auf zentrales ui/Modal migriert. Backdrop/Panel/role=dialog zentral;
// die Cmd+S/Tab-Focus-Trap/ESC-blur-Logik (DD-77/DD-80/DD-97) bleibt lokal am
// dialogRef-Container — Modal mit manageEscape={false}, kein Doppel-ESC.

export default function IssueCreateModal({ open, onClose, onCreated, defaultSprintId }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('feature')
  const [priority, setPriority] = useState(3)
  // DD-133: PO-Notizen statt Context Notes — strikte Trennung Mensch ↔ KI-Brief.
  const [poNotes, setPoNotes] = useState('')
  const [tagIds, setTagIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingFiles, setPendingFiles] = useState([]) // [{ file, preview }]
  const formRef = useRef(null)
  const dialogRef = useRef(null)
  const poNotesWrapRef = useRef(null)

  // DD-164: Tag-Select schliesst bei Esc/× und gibt den Fokus an den
  // Markdown-Editor (CodeMirror) der PO-Notizen weiter. CodeMirror exponiert
  // .cm-content als focusable Element.
  const focusPoNotes = useCallback(() => {
    const el = poNotesWrapRef.current?.querySelector('.cm-content')
    if (el) {
      // Doppel-RAF: nach setOpen(false)/blur darf die Browser-Fokus-Loop einen
      // Tick durchlaufen, sonst landet der Fokus wieder auf <body>.
      requestAnimationFrame(() => requestAnimationFrame(() => el.focus()))
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setType('feature')
      setPriority(3)
      setPoNotes('')
      setTagIds([])
      setError('')
      setPendingFiles(prev => {
        prev.forEach(p => p.preview && URL.revokeObjectURL(p.preview))
        return []
      })
    }
  }, [open])

  // DD-77: CMD+s / CMD+Enter speichert direkt aus Inputs heraus.
  // DD-80: Tab-Focus-Trap im Modal — Fokus verlaesst den Container nicht.
  // DD-97 Round 2: Esc loest erst Feldfokus, schliesst nur ohne aktiven Feldfokus.
  const handleKey = useCallback((e) => {
    if (!open) return
    if (e.key === 'Escape') {
      const el = document.activeElement
      const tag = el?.tagName?.toLowerCase()
      if (
        dialogRef.current?.contains(el) &&
        (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable)
      ) {
        e.preventDefault()
        el.blur()
        return
      }
      e.preventDefault()
      onClose()
      return
    }
    const isMod = e.metaKey || e.ctrlKey
    if (isMod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
      e.preventDefault()
      formRef.current?.requestSubmit()
      return
    }
    // Tab-Trap nur ausloesen, wenn Modal offen und Fokus drinnen.
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusables = dialogRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, handleKey])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Titel ist Pflichtfeld'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          priority: Number(priority),
          po_notes: poNotes.trim() || null,
          tag_ids: tagIds,
          status: 'new',
          assigned_sprint: defaultSprintId || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const newIssue = await res.json()
      // Pending Attachments hochladen, sofern vorhanden
      if (pendingFiles.length) {
        const fd = new FormData()
        for (const p of pendingFiles) fd.append('files', p.file)
        try {
          const aRes = await fetch(`/api/backlog/${newIssue.id}/attachments`, { method: 'POST', body: fd })
          if (aRes.ok) {
            const created = await aRes.json()
            newIssue.attachments = created
          }
        } catch {}
      }
      onCreated(newIssue)
      onClose()
    } catch (err) {
      setError(err.message || 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neues Issue erstellen"
      size="md"
      manageEscape={false}
      autoFocus={false}
      backdropDataUi="issue-create-modal.backdrop"
      dialogDataUi="issue-create-modal.dialog"
    >
      <div ref={dialogRef}>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3" data-ui="issue-create-modal.form">
          <div data-ui="issue-create-modal.stammdaten.title-field">
            <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-base border-0 outline-none bg-[var(--surface0)] text-[var(--text)]"
              placeholder="Issue-Titel..."
              autoFocus
              data-ui="issue-create-modal.stammdaten.title"
            />
          </div>
          <div className="flex gap-3" data-ui="issue-create-modal.stammdaten.meta-row">
            <div className="flex-1" data-ui="issue-create-modal.stammdaten.type-field">
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
                Typ
              </label>
              <Select
                value={type}
                onChange={setType}
                ariaLabel="Typ"
                options={[
                  { value: 'feature', label: 'Feature' },
                  { value: 'bug', label: 'Bug' },
                  { value: 'improvement', label: 'Improvement' },
                  { value: 'chore', label: 'Core/Chore' },
                ]}
                data-ui="issue-create-modal.stammdaten.type"
              />
            </div>
            <div className="w-28" data-ui="issue-create-modal.stammdaten.priority-field">
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
                Priorität
              </label>
              <Select
                value={String(priority)}
                onChange={(v) => setPriority(Number(v))}
                ariaLabel="Prioritaet"
                options={[1,2,3,4,5].map(p => ({ value: String(p), label: `P${p}` }))}
                data-ui="issue-create-modal.stammdaten.priority"
              />
            </div>
          </div>
          <div data-ui="issue-create-modal.tags.field">
            <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
              Tags (optional)
            </label>
            <TagMultiSelect value={tagIds} onChange={setTagIds} onEscape={focusPoNotes} data-ui="issue-create-modal.tags.select" />
          </div>
          <div data-ui="issue-create-modal.po-notes.field">
            <label className="block text-xs font-medium mb-1 inline-flex items-center gap-1 text-[var(--subtext0)]">
              PO-Notizen (optional)
              <span className="text-[10px] normal-case text-[var(--hint)]">
                · Erwartungen, Hinweise, Erläuterungen — Input fürs Refinement
              </span>
            </label>
            <div ref={poNotesWrapRef} data-ui="issue-create-modal.po-notes.editor">
              <MarkdownField
                value={poNotes}
                onChange={setPoNotes}
                rows={4}
                placeholder="Was soll erreicht werden? Was ist wichtig? Erläuterungen zu Screenshots."
              />
            </div>
          </div>
          <div data-ui="issue-create-modal.attachments.field">
            <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
              Bilder (optional)
            </label>
            <AttachmentDropzone
              label="Screenshot ablegen, einfügen (cmd+v) oder klicken"
              onFiles={(files) => {
                const items = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
                setPendingFiles(prev => [...prev, ...items])
              }}
              data-ui="issue-create-modal.attachments.dropzone"
            />
            <AttachmentGallery
              attachments={pendingFiles}
              onRemove={(a) => {
                if (a.preview) URL.revokeObjectURL(a.preview)
                setPendingFiles(prev => prev.filter(x => x !== a))
              }}
              data-ui="issue-create-modal.attachments.gallery"
            />
          </div>
          {error && <p className="text-xs text-[var(--red)]" data-ui="issue-create-modal.error">{error}</p>}
          <div className="flex gap-3 pt-2" data-ui="issue-create-modal.actions">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] bg-[var(--surface1)] text-[var(--text)]"
              data-ui="issue-create-modal.actions.cancel"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white min-h-[44px] bg-[var(--accent-primary)]${saving ? ' opacity-70' : ''}`}
              title="Cmd/Ctrl+S oder Cmd/Ctrl+Enter"
              data-ui="issue-create-modal.actions.save"
            >
              {saving ? 'Erstellen...' : 'Issue erstellen (⌘S)'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
