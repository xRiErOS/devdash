/**
 * IssueCreateModal — kanonisches, token-sauberes Organism (DD-481 Phase-3 Batch-5,
 * Harvest aus src/components/IssueCreateModal.jsx, DD-451/DD-133/DD-164).
 *
 * Domänen-bewusste Einheit: Issue-Erstell-Formular-Modal (Stammdaten + Tags +
 * PO-Notizen + Bild-Attachments) inkl. Pflichtfeld-Validierung. Komponiert das
 * Modal-Molecule (Wrapper/Backdrop/Footer), die Atome Input/Textarea/Button und
 * das Select-Molecule (Typ/Priorität). Tag-Auswahl und Datei-Attachments werden
 * über Render-Slots (`tagSlot`/`attachmentSlot`) hereingereicht, damit der
 * Organism frei von den schwergewichtigen TagMultiSelect-/Dropzone-Molecules bleibt
 * und rein präsentational komponiert.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle submittete via `fetch('/api/backlog', POST)` + Attachment-Upload via
 *    `fetch('/api/backlog/:id/attachments', POST)` inkl. lokalem `saving`-State und
 *    try/catch. Beides ist hier zur Callback-Prop
 *    `onCreate({ title, type, priority, po_notes, tag_ids, status, assigned_sprint })`
 *    gehoben; der In-Flight-Zustand kommt als `saving`-Prop, der Fehlertext als
 *    `error`-Prop (gehoben, der Konsument kennt das Submit-Ergebnis).
 *  - `defaultSprintId` (Pre-Select) und `typeOptions`/`priorityOptions` (Optionen)
 *    kommen als Props statt hardcoded — Library-Default ist gesetzt.
 *  - `onCreated` → `onCreate`, `onClose` bleibt.
 *
 * Ephemerer UI-State (BLEIBT lokal): Form-Felder (title/type/priority/poNotes),
 * Keyboard-/Focus-Trap-Logik (DD-77/DD-80/DD-97), Reset-bei-Schliessen. Das ist
 * reiner UI-Draft-State, kein Daten-State.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(issue:{title:string,type:string,priority:number,po_notes:string|null,tag_ids:Array,status:string,assigned_sprint:(number|null)})=>void} [props.onCreate] - Erstellung bestätigen (gehoben)
 * @param {number|null} [props.defaultSprintId] - Sprint-Pre-Select
 * @param {boolean} [props.saving=false] - Submit in-flight (gehoben)
 * @param {string} [props.error=''] - Fehlertext (gehoben)
 * @param {Array<{value:string,label:string}>} [props.typeOptions] - Typ-Optionen
 * @param {Array<{value:string,label:string}>} [props.priorityOptions] - Prioritäts-Optionen
 * @param {Array} [props.tagIds=[]] - aktuell gewählte Tag-IDs (gehoben)
 * @param {(ids:Array)=>void} [props.onTagsChange] - Tag-Auswahl ändern (gehoben)
 * @param {(args:{value:Array,onChange:(ids:Array)=>void,onEscape:()=>void})=>React.ReactNode} [props.tagSlot] - Render-Slot für die Tag-Auswahl
 * @param {React.ReactNode} [props.attachmentSlot] - Render-Slot für Bild-Attachments
 * @param {string} [props.dataUiScope='issue-create-modal'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import Select from '../molecules/Select.jsx'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'

const TYPE_OPTIONS = [
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'chore', label: 'Core/Chore' },
]

const PRIORITY_OPTIONS = [1, 2, 3, 4, 5].map((p) => ({ value: String(p), label: `P${p}` }))

export default function IssueCreateModal({
  open,
  onClose,
  onCreate,
  defaultSprintId = null,
  saving = false,
  error = '',
  typeOptions = TYPE_OPTIONS,
  priorityOptions = PRIORITY_OPTIONS,
  tagIds = [],
  onTagsChange,
  tagSlot,
  attachmentSlot,
  dataUiScope = 'issue-create-modal',
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('feature')
  const [priority, setPriority] = useState(3)
  // DD-133: PO-Notizen statt Context Notes — strikte Trennung Mensch ↔ KI-Brief.
  const [poNotes, setPoNotes] = useState('')
  const [localError, setLocalError] = useState('')
  const formRef = useRef(null)
  const dialogRef = useRef(null)
  const poNotesWrapRef = useRef(null)

  // DD-164: Tag-Select schliesst bei Esc/× und gibt den Fokus an den PO-Notizen-
  // Editor weiter. Doppel-RAF: nach blur darf die Fokus-Loop einen Tick laufen.
  const focusPoNotes = useCallback(() => {
    const el = poNotesWrapRef.current?.querySelector('textarea, .cm-content')
    if (el) {
      requestAnimationFrame(() => requestAnimationFrame(() => el.focus()))
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setType('feature')
      setPriority(3)
      setPoNotes('')
      setLocalError('')
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
      onClose?.()
      return
    }
    const isMod = e.metaKey || e.ctrlKey
    if (isMod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
      e.preventDefault()
      formRef.current?.requestSubmit()
      return
    }
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) { setLocalError('Titel ist Pflichtfeld'); return }
    setLocalError('')
    onCreate?.({
      title: title.trim(),
      type,
      priority: Number(priority),
      po_notes: poNotes.trim() || null,
      tag_ids: tagIds,
      status: 'new',
      assigned_sprint: defaultSprintId || null,
    })
  }

  const shownError = error || localError

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neues Issue erstellen"
      size="md"
      manageEscape={false}
      autoFocus={false}
      busy={saving}
      backdropDataUi={`${dataUiScope}.backdrop`}
      dialogDataUi={dataUiScope}
    >
      <div ref={dialogRef}>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3" data-ui={`${dataUiScope}.form`}>
          <div data-ui={`${dataUiScope}.stammdaten.title-field`}>
            <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
              Titel *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue-Titel..."
              autoFocus
              data-ui={`${dataUiScope}.stammdaten.title`}
            />
          </div>
          <div className="flex gap-3" data-ui={`${dataUiScope}.stammdaten.meta-row`}>
            <div className="flex-1" data-ui={`${dataUiScope}.stammdaten.type-field`}>
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
                Typ
              </label>
              <Select
                value={type}
                onChange={setType}
                ariaLabel="Typ"
                options={typeOptions}
              />
            </div>
            <div className="w-28" data-ui={`${dataUiScope}.stammdaten.priority-field`}>
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
                Priorität
              </label>
              <Select
                value={String(priority)}
                onChange={(v) => setPriority(Number(v))}
                ariaLabel="Prioritaet"
                options={priorityOptions}
              />
            </div>
          </div>
          {tagSlot && (
            <div data-ui={`${dataUiScope}.tags.field`}>
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
                Tags (optional)
              </label>
              {tagSlot({ value: tagIds, onChange: onTagsChange, onEscape: focusPoNotes })}
            </div>
          )}
          <div data-ui={`${dataUiScope}.po-notes.field`}>
            <label className="block text-xs font-medium mb-1 inline-flex items-center gap-1 text-[var(--subtext0)]">
              PO-Notizen (optional)
              <span className="text-[10px] normal-case text-[var(--subtext1)]">
                · Erwartungen, Hinweise, Erläuterungen — Input fürs Refinement
              </span>
            </label>
            <div ref={poNotesWrapRef} data-ui={`${dataUiScope}.po-notes.editor`}>
              <Textarea
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                rows={4}
                placeholder="Was soll erreicht werden? Was ist wichtig? Erläuterungen zu Screenshots."
              />
            </div>
          </div>
          {attachmentSlot && (
            <div data-ui={`${dataUiScope}.attachments.field`}>
              <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
                Bilder (optional)
              </label>
              {attachmentSlot}
            </div>
          )}
          {shownError && (
            <p className="text-xs text-[var(--accent-danger)]" data-ui={`${dataUiScope}.error`}>
              {shownError}
            </p>
          )}
          <div className="flex gap-3 pt-2" data-ui={`${dataUiScope}.actions`}>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onClose}
              className="flex-1"
              data-ui={`${dataUiScope}.actions.cancel`}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={saving}
              className="flex-1"
              title="Cmd/Ctrl+S oder Cmd/Ctrl+Enter"
              data-ui={`${dataUiScope}.actions.save`}
            >
              {saving ? 'Erstellen...' : 'Issue erstellen (⌘S)'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
