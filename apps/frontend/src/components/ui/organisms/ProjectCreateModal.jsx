/**
 * ProjectCreateModal — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/ProjectCreateModal.jsx, DD-451).
 *
 * Domänen-bewusste Einheit: Projekt-Erstell-Modal mit Stammdaten-Form,
 * automatischer Slug-/Prefix-Generierung aus dem Namen (mit „touched"-Override)
 * und einer Catppuccin-Farbpalette als Color-Picker. Komponiert das Modal-Molecule
 * (Wrapper/Backdrop/ESC/Footer) und das Button-Atom (Footer-Aktionen).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle lud die bereits vergebenen Slugs/Prefixes via `fetch('/api/projects')`
 *    im open-useEffect, um Duplikat-Validierung zu fahren. Diese Mengen kommen
 *    jetzt als `existingSlugs`/`existingPrefixes`-Props (Arrays) rein; der Konsument
 *    besitzt den Fetch.
 *  - Quelle submittete via `fetch('/api/projects', POST)` inkl. lokalem
 *    `submitting`-State + `setActiveProjectId(data.id)` + `onCreated(data)`. Die
 *    Persistenz ist hier zur Callback-Prop `onCreate(payload)` gehoben; der
 *    In-Flight-Zustand kommt als `submitting`-Prop, der Server-Fehlertext als
 *    `error`-Prop. `onClose` bleibt.
 *
 * Ephemerer UI-State (BLEIBT lokal): die Form-Felder (`name`/`slug`/`prefix`/
 * `description`/`color`/`repoPath`), die `touched`-Refs (steuern die Auto-Gen),
 * der `nameRef`-Autofocus und das Reset-beim-Öffnen sind reiner UI-Draft-State.
 *
 * RAW-HEX → TOKEN (DD-481 Ziel: 0 Raw-Hex): die Quelle hielt 6 hartcodierte
 * Palette-Hex-Werte als persistierte Datenwerte. Sie sind hier auf die
 * semantischen Catppuccin-CSS-Var-Konstanten in `COLOR_PALETTE` gemappt (z.B.
 * `var(--mauve)`); der gewählte Wert (CSS-Var-String) wird als `color` ins
 * `onCreate`-Payload gegeben. Die dynamische Swatch-Füllfarbe wird NICHT als
 * inline-Style gesetzt, sondern via ref-Callback als CSS-Custom-Property
 * (`--swatch-color` / `--swatch-ring`) auf das Element geschrieben (DD-451) —
 * keine inline-Styles.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string[]} [props.existingSlugs=[]] - bereits vergebene Slugs (Duplikat-Guard, gehoben)
 * @param {string[]} [props.existingPrefixes=[]] - bereits vergebene Prefixes (gehoben)
 * @param {boolean} [props.submitting=false] - Anlage in-flight (gehoben)
 * @param {string} [props.error=''] - Server-Fehlertext (gehoben)
 * @param {(payload:{slug:string,name:string,prefix:string,description:string|null,color:string,repo_path:string|null})=>void} [props.onCreate] - Projekt anlegen (gehoben)
 * @param {()=>void} [props.onClose] - Modal schliessen
 * @param {string} [props.dataUiScope='project-create-modal'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../molecules/Modal.jsx'
import Button from '../atoms/Button.jsx'

// Catppuccin-Farbpalette als Color-Picker-Defaults. Raw-Hex der Quelle
// → semantische CSS-Var-Token-Konstanten (0 Raw-Hex). `value` ist der persistierte
// Datenwert (CSS-Var-String), der ins onCreate-Payload geht.
const COLOR_PALETTE = [
  { name: 'mauve', value: 'var(--mauve)' },
  { name: 'blue', value: 'var(--blue)' },
  { name: 'green', value: 'var(--green)' },
  { name: 'peach', value: 'var(--peach)' },
  { name: 'lavender', value: 'var(--lavender)' },
  { name: 'teal', value: 'var(--teal)' },
]

function slugifyName(name) {
  return String(name || '').toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
}

function defaultPrefix(name) {
  const cleaned = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned.slice(0, 4) || ''
}

// Dynamische Swatch-Füllfarbe via ref-Callback-CSS-Custom-Property (DD-451) statt
// inline-Style. `color`/`ring` sind CSS-Var-Strings → kein Raw-Hex, kein inline-Style.
function Swatch({ swatch, selected, onSelect, dataUiScope }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--swatch-color', swatch.value)
    ref.current.style.setProperty('--swatch-ring', selected ? 'var(--text)' : 'transparent')
  }, [swatch.value, selected])
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(swatch.value)}
      title={swatch.name}
      aria-label={swatch.name}
      aria-pressed={selected}
      data-ui={`${dataUiScope}.color.swatch.${swatch.name}`}
      className="w-8 h-8 rounded-full bg-[var(--swatch-color)] border-2 border-[var(--swatch-ring)]"
    />
  )
}

function Field({ label, hint, error, children, dataUi }) {
  return (
    <label className="block" data-ui={dataUi}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-mono uppercase tracking-wide text-[var(--hint)]">{label}</span>
        {error ? (
          <span className="text-[11px] font-mono text-[var(--red)]">{error}</span>
        ) : hint ? (
          <span className="text-[11px] font-mono text-[var(--hint)]">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  )
}

export default function ProjectCreateModal({
  open,
  existingSlugs = [],
  existingPrefixes = [],
  submitting = false,
  error = '',
  onCreate,
  onClose,
  dataUiScope = 'project-create-modal',
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [prefix, setPrefix] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLOR_PALETTE[0].value)
  const [repoPath, setRepoPath] = useState('')
  const nameRef = useRef(null)
  const slugTouched = useRef(false)
  const prefixTouched = useRef(false)

  // Reset-beim-Öffnen + Autofocus (ephemerer UI-State, kein Datenladen mehr).
  useEffect(() => {
    if (!open) return
    setName(''); setSlug(''); setPrefix(''); setDescription(''); setColor(COLOR_PALETTE[0].value)
    setRepoPath('')
    slugTouched.current = false
    prefixTouched.current = false
    const t = setTimeout(() => nameRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  // Auto-Generierung von Slug/Prefix aus dem Namen, solange nicht manuell editiert.
  useEffect(() => {
    if (!slugTouched.current) setSlug(slugifyName(name))
    if (!prefixTouched.current) setPrefix(defaultPrefix(name))
  }, [name])

  const slugSet = new Set(existingSlugs)
  const prefixSet = new Set(existingPrefixes.map((p) => String(p || '').toUpperCase()))

  const slugValid = /^[a-z0-9-]+$/.test(slug) && slug.length > 0
  const prefixValid = /^[A-Z0-9]{2,6}$/.test(prefix)
  const slugDup = slugSet.has(slug)
  const prefixDup = prefixSet.has(prefix)
  const canSubmit = name.trim() && slugValid && prefixValid && !slugDup && !prefixDup && !submitting

  const submit = (e) => {
    e?.preventDefault?.()
    if (!canSubmit) return
    onCreate?.({
      slug,
      name: name.trim(),
      prefix,
      description: description.trim() || null,
      color,
      repo_path: repoPath.trim() || null,
    })
  }

  const titleId = `${dataUiScope}.title`
  const formId = `${dataUiScope}-form`

  const titleNode = (
    <span className="flex items-center justify-between w-full" id={titleId} data-ui={`${dataUiScope}.title`}>
      <span className="text-base font-bold font-display">Neues Projekt</span>
      <button
        type="button"
        onClick={() => { if (!submitting) onClose?.() }}
        disabled={submitting}
        aria-label="Schliessen"
        data-ui={`${dataUiScope}.header.close`}
        className="rounded-lg flex items-center justify-center w-8 h-8 text-[var(--subtext0)] hover:bg-[var(--surface0)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <X size={16} />
      </button>
    </span>
  )

  const footer = (
    <>
      <Button
        variant="secondary"
        size="md"
        disabled={submitting}
        onClick={() => { if (!submitting) onClose?.() }}
        data-ui={`${dataUiScope}.actions.cancel`}
      >
        Abbrechen
      </Button>
      <Button
        variant="primary"
        size="md"
        type="submit"
        form={formId}
        loading={submitting}
        disabled={!canSubmit}
        data-ui={`${dataUiScope}.actions.save`}
      >
        {submitting ? 'Speichere…' : 'Anlegen'}
      </Button>
    </>
  )

  const inputClass = 'w-full px-3 py-2 rounded-lg outline-none border-0 text-base bg-[var(--surface0)] text-[var(--text)]'
  const monoInputClass = `${inputClass} font-mono`

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      size="sm"
      align="top"
      fade
      padded={false}
      title={titleNode}
      labelledById={titleId}
      footer={footer}
      backdropDataUi={`${dataUiScope}.backdrop`}
      dialogDataUi={dataUiScope}
    >
      <form
        id={formId}
        onSubmit={submit}
        className="p-4 space-y-3"
        data-ui={`${dataUiScope}.form`}
      >
        <Field label="Name *" dataUi={`${dataUiScope}.stammdaten.name`}>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Slug *"
            hint="a-z 0-9 -"
            error={slug && !slugValid ? 'Ungueltig' : slugDup ? 'Vergeben' : null}
            dataUi={`${dataUiScope}.stammdaten.slug`}
          >
            <input
              type="text"
              value={slug}
              onChange={(e) => { slugTouched.current = true; setSlug(e.target.value.toLowerCase()) }}
              className={monoInputClass}
            />
          </Field>
          <Field
            label="Prefix *"
            hint="2-6 GROSS/0-9"
            error={prefix && !prefixValid ? 'Ungueltig' : prefixDup ? 'Vergeben' : null}
            dataUi={`${dataUiScope}.stammdaten.prefix`}
          >
            <input
              type="text"
              value={prefix}
              onChange={(e) => { prefixTouched.current = true; setPrefix(e.target.value.toUpperCase()) }}
              maxLength={6}
              className={monoInputClass}
            />
          </Field>
        </div>
        <Field label="Color" dataUi={`${dataUiScope}.color`}>
          <div className="flex gap-2">
            {COLOR_PALETTE.map((swatch) => (
              <Swatch
                key={swatch.name}
                swatch={swatch}
                selected={color === swatch.value}
                onSelect={setColor}
                dataUiScope={dataUiScope}
              />
            ))}
          </div>
        </Field>
        <Field label="Description" dataUi={`${dataUiScope}.stammdaten.description`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <Field label="Repo-Path" hint="z.B. /Users/.../projektname" dataUi={`${dataUiScope}.stammdaten.repo-path`}>
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            className={monoInputClass}
          />
        </Field>
        {error && (
          <div
            className="text-sm rounded-lg px-3 py-2 bg-[var(--surface0)] text-[var(--red)]"
            data-ui={`${dataUiScope}.stammdaten.error`}
          >
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
