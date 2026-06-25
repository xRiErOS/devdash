// GoalEditor — Molecule (DD-503 Harvest aus src/views/SprintDetail.jsx).
//
// Kleiner kontrollierter Inline-Editor: Textarea + Cancel/Save-Buttons mit
// Tastatur-Shortcuts (Escape → onCancel; Cmd/Ctrl+Enter oder Cmd/Ctrl+S →
// submit). Async onSave(text.trim() || null) mit saving- + error-State.
//
// PRESENTATIONAL: Kein Store/Fetch. Der Submit delegiert über den onSave-
// Callback nach oben; die View entscheidet, was gespeichert wird. Ephemerer
// UI-State (text/saving/error) ist bewusst lokal — reiner Editor-State.
//
// data-ui-Wurzelbereich ist parametrisiert (`dataUiScope`, Default
// 'goal-editor'). Die SprintDetail-View reicht 'sprint-detail.goal-editor'
// durch, sodass ihre Anker 1:1 erhalten bleiben (Reusable Sub-Component
// bekommt den Slug per PROP).
//
// @param {object} props
// @param {string|null} [props.goal] - aktueller Goal-Text (Vorbelegung).
// @param {(text:(string|null)) => (void|Promise<void>)} props.onSave - Speichern-Callback (erhält getrimmten Text oder null).
// @param {() => void} props.onCancel - Abbrechen-Callback (auch via Escape).
// @param {string} [props.placeholder='Sprint-Goal beschreiben…'] - Textarea-Placeholder.
// @param {string} [props.dataUiScope='goal-editor'] - parametrisierter data-ui-Wurzelbereich.

import { useState } from 'react'
import { X, Check } from 'lucide-react'

export default function GoalEditor({
  goal,
  onSave,
  onCancel,
  placeholder = 'Sprint-Goal beschreiben…',
  dataUiScope = 'goal-editor',
}) {
  const [text, setText] = useState(goal || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(text.trim() || null)
    } catch (e) {
      setError(e.message || 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    const isMod = e.metaKey || e.ctrlKey
    if (isMod && (e.key === 'Enter' || e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div
      data-ui={dataUiScope}
      className="bg-[var(--base)] border border-[var(--surface1)] rounded-lg p-[var(--space-3,12px)]"
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        rows={3}
        autoFocus
        data-ui={`${dataUiScope}.text`}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 outline-none resize-y text-sm font-[inherit] text-[var(--text)] leading-relaxed min-h-[60px]"
      />
      {error && (
        <p className="text-xs text-[var(--accent-danger)] my-1 mx-0">{error}</p>
      )}
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          data-ui={`${dataUiScope}.cancel`}
          className="bg-transparent border-0 text-[var(--subtext0)] px-3 py-1.5 rounded-md text-[13px] cursor-pointer inline-flex items-center gap-1"
        >
          <X size={14} />
          Abbrechen
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          data-ui={`${dataUiScope}.save`}
          className={`bg-[var(--accent-primary)] text-[var(--on-accent)] border-0 px-3 py-1.5 rounded-md text-[13px] font-bold inline-flex items-center gap-1 ${saving ? 'cursor-wait opacity-60' : 'cursor-pointer opacity-100'}`}
        >
          <Check size={14} />
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
