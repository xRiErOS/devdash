// DD-462: MilestoneForm — extrahiert aus src/views/MilestoneView.jsx.
// Ursprünglich definiert in MilestoneView (DD-134 R2 / DD-305 / DD-291).
//
// Einzige authoritative Definition; MilestoneView + MilestoneDetail
// importieren von hier.
//
// Props:
//   initial    {object|null}  - null → Create-Modus; Milestone-Objekt → Edit-Modus
//   onSaved    {function}     - wird mit dem gespeicherten Milestone-Objekt aufgerufen
//   onCancel   {function}     - Abbrechen / Schließen
//   chrome     {'modal'|'page'} - 'modal' → eigene Backdrop+Panel-Hülle (Legacy);
//                                 'page'  → body direkt (Inline-Einbettung)

import { useEffect, useState } from 'react'
import { X, Check, EyeOff } from 'lucide-react'
import MarkdownField from '../MarkdownField.jsx'

// DD-134 R2 / DD-305: MilestoneForm — chrome='modal' wird fuer Create und Edit genutzt.
// DD-291: Edit-Mode bekommt zusätzlich einen Defer-Toggle (Zurückstellen-Zeile,
// Mockup State C). Speichert via PATCH /api/milestones/:id { deferred } separat,
// damit der reguläre PUT-Endpoint unverändert bleibt.
export function MilestoneForm({ initial = null, onSaved, onCancel, chrome = 'modal' }) {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [targetDate, setTargetDate] = useState(initial?.target_date || '')
  const [deferred, setDeferred] = useState(!!initial?.deferred)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // DD-96: ESC schliesst das Inline-Form ohne Page-Navigation. Cmd+S/Cmd+Enter speichert.
  // DD-97 Round 2: Esc loest erst Feldfokus, nur ausserhalb von Feldern wird abgebrochen.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const el = document.activeElement
        const tag = el?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) {
          e.preventDefault()
          el.blur()
          return
        }
        e.preventDefault(); onCancel(); return
      }
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault()
        submit()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, targetDate])

  const submit = async () => {
    if (!name.trim()) { setError('Name ist Pflichtfeld'); return }
    setSaving(true)
    try {
      const url = isEdit ? `/api/milestones/${initial.id}` : '/api/milestones'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          target_date: targetDate || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Fehler')
      let m = await res.json()
      // DD-291: deferred-Wert separat via PATCH speichern, sobald sich der
      // Toggle ggü. initial geändert hat. Nur im Edit-Mode relevant — beim
      // Create existiert noch keine ID, und neu angelegte Milestones starten
      // semantisch immer als nicht-deferred (D02: kein Auto-Defer).
      if (isEdit && !!initial?.deferred !== deferred) {
        const patchRes = await fetch(`/api/milestones/${initial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deferred }),
        })
        if (!patchRes.ok) throw new Error((await patchRes.json().catch(() => ({}))).error || 'Defer-Flag-Speicherung fehlgeschlagen')
        m = await patchRes.json()
      }
      onSaved(m)
    } catch (e) {
      setError(e.message || 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  const body = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base font-display">{isEdit ? 'Milestone bearbeiten' : 'Neuen Milestone anlegen'}</h3>
        <button onClick={onCancel} aria-label="Abbrechen" data-ui="milestones.form.close" className="rounded text-[var(--subtext0)]">
          <X size={16} />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
            Name <span className="text-[var(--accent-danger)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            data-ui="milestones.form.name"
            placeholder="v0.3, MVP, Beta-Launch …"
            className="w-full rounded-lg px-3 py-2 border-0 outline-none bg-[var(--surface0)] text-[var(--text)] text-base"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">Beschreibung</label>
          <div data-ui="milestones.form.description">
            <MarkdownField
              value={description}
              onChange={setDescription}
              rows={2}
              placeholder="Worum geht es bei diesem Milestone?"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-[var(--subtext0)]">Zieldatum</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            data-ui="milestones.form.target-date"
            className="w-full rounded-lg px-3 py-2 border-0 outline-none bg-[var(--surface0)] text-[var(--text)] text-base"
          />
        </div>
        {/* DD-291: Defer-Toggle-Zeile (Mockup State C, Decision D08 — Info-Akzent).
            Nur im Edit-Mode sichtbar — Neu-Anlage startet immer mit deferred=false. */}
        {isEdit && (
          <div
            role="checkbox"
            tabIndex={0}
            aria-checked={deferred}
            data-testid="milestone-form-defer-toggle"
            data-ui="milestones.form.defer-toggle"
            onClick={() => setDeferred(d => !d)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setDeferred(d => !d)
              }
            }}
            className={[
              'flex items-start gap-[10px] p-[10px_12px] rounded-[8px] cursor-pointer transition-[background,border-color] duration-[120ms]',
              deferred
                ? 'bg-[color-mix(in_srgb,var(--accent-info)_18%,transparent)] border border-[var(--accent-info)]'
                : 'bg-[color-mix(in_srgb,var(--accent-info)_6%,transparent)] border border-[color-mix(in_srgb,var(--accent-info)_25%,transparent)]',
            ].join(' ')}
          >
            {/* Checkbox-Visual */}
            <span
              aria-hidden="true"
              className={[
                'w-[18px] h-[18px] rounded-[4px] grid place-items-center text-[var(--on-accent)] shrink-0 mt-[2px]',
                deferred
                  ? 'bg-[var(--accent-info)] border border-[var(--accent-info)]'
                  : 'bg-[var(--surface0)] border border-[var(--surface2)]',
              ].join(' ')}
            >
              {deferred && <Check size={12} />}
            </span>
            <span className="flex flex-col gap-1 flex-1">
              <span className="inline-flex items-center gap-[6px] font-display font-bold text-[13px] text-[var(--text)]">
                <EyeOff size={14} className="text-[var(--accent-info)]" />
                Zurückstellen
              </span>
              <span className="text-[12px] text-[var(--subtext0)] leading-[1.4]">
                Zurückgestellte Milestones werden im Default ausgeblendet. Zugeordnete Sprints
                verschwinden ebenfalls aus dem Sprint-Board. Reaktivierbar über die Indikator-Pill
                oben rechts.
              </span>
            </span>
          </div>
        )}
        {error && <p className="text-xs text-[var(--accent-danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            data-ui="milestones.form.cancel"
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-transparent text-[var(--subtext0)] min-h-[36px]"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            data-ui="milestones.form.save"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[var(--accent-primary)] min-h-[36px] disabled:opacity-50"
          >
            {saving ? 'Speichern…' : (isEdit ? 'Speichern' : 'Erstellen')}
          </button>
        </div>
      </div>
    </>
  )

  if (chrome === 'modal') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"
        onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="rounded-xl p-6 w-full max-w-md shadow-2xl mx-4 bg-[var(--base)] border border-[var(--surface1)] max-h-[90vh] overflow-y-auto"
        >
          {body}
        </div>
      </div>
    )
  }
  // Inline-Fallback fuer dedizierte Einbettungen.
  return (
    <div className="p-4">
      {body}
    </div>
  )
}

export default MilestoneForm
