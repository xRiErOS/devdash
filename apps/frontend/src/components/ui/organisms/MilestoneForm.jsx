/**
 * MilestoneForm — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/milestone/MilestoneForm.jsx, urspr. DD-134 R2 / DD-291 / DD-305 / DD-462).
 *
 * Domänen-bewusste Einheit: Anlage-/Bearbeitungs-Formular für einen Milestone
 * (Name, Beschreibung, Zieldatum, Defer-Toggle im Edit-Mode). Komponiert die
 * Atoms Input, Textarea und Button. Trägt eine eigene Chrome-Hülle ('modal'
 * Backdrop+Panel | 'page' Inline) und die Form-Tastatur-Shortcuts (ESC schließt /
 * blurrt, Cmd+S bzw. Cmd+Enter speichert).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle führte `fetch('/api/milestones' | '/api/milestones/:id')` (POST/PUT)
 *    plus einen separaten `PATCH …/:id { deferred }` selbst aus und meldete den
 *    persistierten Milestone via `onSaved(m)`. Diese Mutation ist hier zur reinen
 *    Callback-Prop `onSubmit(values)` gehoben — values = { name, description,
 *    target_date, deferred, isEdit, id }. Der Konsument führt POST/PUT/PATCH aus.
 *  - Quelle hielt `saving` lokal um den async-fetch. Da die Mutation jetzt extern
 *    läuft, kommt der In-Flight-Zustand als `saving`-Prop herein (Trigger disabled).
 *  - Quelle hielt `error` lokal (fetch-Fehlertext). Validierungs-/Mutationsfehler
 *    kommen jetzt als `error`-Prop herein; die reine Pflichtfeld-Leerprüfung
 *    (Name) bleibt lokal als Submit-Guard (verhindert leeren onSubmit-Call).
 *  - `initial`-Prop in `milestone` umbenannt (null → Create-Modus, Objekt → Edit).
 *
 * Ephemerer UI-State (BLEIBT lokal): die Draft-Felder (name/description/
 * targetDate/deferred via useState) und der ESC/Cmd+S-Keyboard-Handler (useEffect,
 * KEIN Datenladen).
 *
 * @param {object} props
 * @param {object|null} [props.milestone=null] - null → Create; Milestone-Objekt → Edit
 *        ({ id, name, description, target_date, deferred })
 * @param {(values:{name:string,description:string|null,target_date:string|null,deferred:boolean,isEdit:boolean,id?:number})=>void} [props.onSubmit] - Speichern (gehoben)
 * @param {()=>void} [props.onCancel] - Abbrechen / Schließen (X / ESC / Backdrop)
 * @param {'modal'|'page'} [props.chrome='modal'] - 'modal' → Backdrop+Panel; 'page' → Inline-Body
 * @param {boolean} [props.saving=false] - Mutation in-flight → Trigger disabled (gehoben)
 * @param {string} [props.error=''] - extern gemeldeter Fehler-Text (gehoben)
 * @param {string} [props.dataUiScope='milestone-form'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useEffect, useId, useState } from 'react'
import { X, Check, EyeOff } from 'lucide-react'
import Modal from '../molecules/Modal.jsx'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'
import IconButton from '../atoms/IconButton.jsx'

// Defer-Toggle-Zeile (DD-291, Mockup State C, D08 — Info-Akzent): Wrapper-Tint je
// nach Zustand. Statische Klassen-Maps (JIT-sichtbar, kein String-Interpolation).
const DEFER_ROW = {
  on: 'bg-[color-mix(in_srgb,var(--accent-info)_18%,transparent)] border-[var(--accent-info)]',
  off: 'bg-[color-mix(in_srgb,var(--accent-info)_6%,transparent)] border-[color-mix(in_srgb,var(--accent-info)_25%,transparent)]',
}
const DEFER_BOX = {
  on: 'bg-[var(--accent-info)] border-[var(--accent-info)]',
  off: 'bg-[var(--surface0)] border-[var(--surface2)]',
}

export default function MilestoneForm({
  milestone = null,
  onSubmit,
  onCancel,
  chrome = 'modal',
  saving = false,
  error = '',
  dataUiScope = 'milestone-form',
}) {
  const isEdit = !!milestone
  // Ephemerer Draft-State (bleibt lokal — KEIN Daten-State).
  const [name, setName] = useState(milestone?.name || '')
  const [description, setDescription] = useState(milestone?.description || '')
  const [targetDate, setTargetDate] = useState(milestone?.target_date || '')
  const [deferred, setDeferred] = useState(!!milestone?.deferred)
  // Lokaler Pflichtfeld-Guard (Mutations-/Validierungsfehler kommen via `error`-Prop).
  const [localError, setLocalError] = useState('')
  // A11Y (B01): label↔control via htmlFor/id koppeln (useId = instanz-eindeutig, mehrfach
  // gerendert kollisionsfrei). Macht getByLabelText nutzbar — der kanonische play-Selektor.
  const fid = useId()

  const submit = () => {
    if (!name.trim()) { setLocalError('Name ist Pflichtfeld'); return }
    setLocalError('')
    onSubmit?.({
      name: name.trim(),
      description: description.trim() || null,
      target_date: targetDate || null,
      deferred,
      isEdit,
      id: milestone?.id,
    })
  }

  // DD-96/DD-97: ESC blurrt ein fokussiertes Feld, sonst Abbruch. Cmd+S/Cmd+Enter
  // speichert. Zustandsloser Keyboard-Handler (KEIN Datenladen) — bleibt lokal.
  useEffect(() => {
    // A11Y-B04 (W0-T15): globale Tastatur-Shortcuts (ESC/Cmd+S) NUR im Modal-Modus
    // binden. Im Inline/page-Modus würde ein document-weiter keydown-Listener fremde
    // ESC/Cmd+S-Eingaben hijacken (kein Modal-Kontext → kein globaler Hijack).
    if (chrome !== 'modal') return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const el = document.activeElement
        const tag = el?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) {
          e.preventDefault()
          el.blur()
          return
        }
        e.preventDefault(); onCancel?.(); return
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
  }, [name, description, targetDate, deferred, chrome])

  const shownError = error || localError

  const body = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 data-ui={`${dataUiScope}.heading`} className="font-bold text-base font-display">
          {isEdit ? 'Milestone bearbeiten' : 'Neuen Milestone anlegen'}
        </h3>
        <IconButton
          icon={<X size={16} aria-hidden="true" />}
          label="Abbrechen"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          data-ui={`${dataUiScope}.close`}
        />
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor={`${fid}-name`} className="block text-xs font-medium mb-1 text-[var(--subtext0)]">
            Name <span className="text-[var(--accent-danger)]">*</span>
          </label>
          <Input
            id={`${fid}-name`}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            data-ui={`${dataUiScope}.name`}
            placeholder="v0.3, MVP, Beta-Launch …"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor={`${fid}-description`} className="block text-xs font-medium mb-1 text-[var(--subtext0)]">Beschreibung</label>
          <Textarea
            id={`${fid}-description`}
            value={description}
            onChange={e => setDescription(e.target.value)}
            data-ui={`${dataUiScope}.description`}
            rows={1}
            className="resize-none min-h-[40px]"
            placeholder="Worum geht es bei diesem Milestone?"
          />
        </div>
        <div>
          <label htmlFor={`${fid}-target-date`} className="block text-xs font-medium mb-1 text-[var(--subtext0)]">Zieldatum</label>
          <Input
            id={`${fid}-target-date`}
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            data-ui={`${dataUiScope}.target-date`}
          />
        </div>
        {/* DD-291: Defer-Toggle-Zeile (Mockup State C, D08 — Info-Akzent).
            Nur im Edit-Mode sichtbar — Neu-Anlage startet immer mit deferred=false. */}
        {isEdit && (
          <div
            role="checkbox"
            tabIndex={0}
            aria-checked={deferred}
            data-testid="milestone-form-defer-toggle"
            data-ui={`${dataUiScope}.defer-toggle`}
            onClick={() => setDeferred(d => !d)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setDeferred(d => !d)
              }
            }}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors duration-150 ${deferred ? DEFER_ROW.on : DEFER_ROW.off}`}
          >
            {/* Checkbox-Visual */}
            <span
              aria-hidden="true"
              className={`w-[18px] h-[18px] rounded grid place-items-center text-[var(--on-accent)] shrink-0 mt-0.5 border ${deferred ? DEFER_BOX.on : DEFER_BOX.off}`}
            >
              {deferred && <Check size={12} />}
            </span>
            <span className="flex flex-col gap-1 flex-1">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-[var(--text)]">
                <EyeOff size={14} className="text-[var(--accent-info)]" />
                Zurückstellen
              </span>
              <span className="text-xs text-[var(--subtext0)] leading-snug">
                Zurückgestellte Milestones werden im Default ausgeblendet. Zugeordnete Sprints
                verschwinden ebenfalls aus dem Sprint-Board. Reaktivierbar über die Indikator-Pill
                oben rechts.
              </span>
            </span>
          </div>
        )}
        {shownError && <p data-ui={`${dataUiScope}.error`} className="text-xs text-[var(--accent-danger)]">{shownError}</p>}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="md"
            onClick={onCancel}
            data-ui={`${dataUiScope}.cancel`}
          >
            Abbrechen
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={submit}
            disabled={saving || !name.trim()}
            loading={saving}
            data-ui={`${dataUiScope}.save`}
          >
            {isEdit ? 'Speichern' : 'Erstellen'}
          </Button>
        </div>
      </div>
    </>
  )

  if (chrome === 'modal') {
    // V2 (B2): Modal-Molecule liefert Backdrop+Panel+zentralen Focus-Trap (W0-T15,
    // A11Y-B03). headerless = body trägt seinen eigenen Header/Close (gilt auch für
    // page-chrome). manageEscape={false} → MilestoneForm behält ESC-blur + Cmd+S
    // (kein Doppel-ESC); der Tab-Focus-Trap läuft im Modal unabhängig von ESC.
    return (
      <Modal
        open
        onClose={onCancel}
        busy={saving}
        headerless
        manageEscape={false}
        size="sm"
        dialogDataUi={dataUiScope}
        backdropDataUi={`${dataUiScope}.backdrop`}
      >
        {body}
      </Modal>
    )
  }
  // Inline-Fallback für dedizierte Einbettungen (chrome='page').
  return (
    <div data-ui={dataUiScope} className="p-4">
      {body}
    </div>
  )
}
