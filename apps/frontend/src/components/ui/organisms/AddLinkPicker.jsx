/**
 * AddLinkPicker — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/projectHome/AddLinkPicker.jsx).
 *
 * Domänen-bewusste Einheit: 4-Typen-Link-Picker (spec/issue/vault/url) für die
 * Todo-/Issue-Link-Verknüpfung. Dashed "Link hinzufügen"-Button öffnet einen
 * Typ-Picker (4 Optionen mit farbigem OptIcon + Label); nach Typ-Wahl erscheint
 * ein Target-Input + Submit. Client-seitige Validierung des Issue-Keys / der URL
 * bleibt erhalten. Komponiert die Atoms OptIcon, Input und Button.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API. Gehobene Kopplung gegenüber
 * der Quelle:
 *  - Quelle importierte `LINK_TYPES` aus `lib/projectHomeApi.js`. Das ist hier zur
 *    lokalen Konstante `LINK_TYPES` inlined → keine API-/Store-Kopplung mehr.
 *  - Die `addLink`-Mutation war in der Quelle bereits zur `onAdd(link)`-Callback-Prop
 *    gehoben; dieser Vertrag bleibt unverändert. `onAdd` darf ein Promise liefern;
 *    Submit-/Fehler-State wird lokal verwaltet.
 *
 * Ephemerer UI-State (bleibt): open/type/target/error/submitting (useState),
 * Form-Submit-Handler, Reset-Handler. Das ist KEIN Daten-State.
 *
 * @param {object} props
 * @param {(link:{type:string,target:string})=>(void|Promise<void>)} [props.onAdd] - Link-hinzufügen-Mutation (gehoben)
 * @param {boolean} [props.disabled=false] - Picker komplett deaktivieren
 * @param {string} [props.dataUiScope='add-link-picker'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen am geöffneten Container
 */

import { useState } from 'react'
import OptIcon from '../atoms/OptIcon.jsx'
import Input from '../atoms/Input.jsx'
import Button from '../atoms/Button.jsx'

// Inlined (gehoben aus lib/projectHomeApi.js) — Reihenfolge = Anzeige-Reihenfolge.
const LINK_TYPES = ['spec', 'issue', 'vault', 'url']

const ISSUE_PATTERN = /^[A-Z]{2,6}-\d+$/
const URL_PATTERN = /^https?:\/\//i

const TYPE_LABELS = { spec: 'Spec-Datei', issue: 'Issue-Key', vault: 'Vault-Wikilink', url: 'URL' }
const TYPE_PLACEHOLDERS = { spec: 'specs/2026-05-22-foo.md', issue: 'DD-123', vault: 'My Note', url: 'https://example.com' }

// Aktive Typ-Option → statische Token-Klassen je Option (JIT-sichtbar, keine Interpolation).
const ACTIVE_TYPE_CLASS = {
  spec: 'bg-[color-mix(in_srgb,var(--accent-warning)_12%,transparent)] border-[var(--accent-warning)] text-[var(--accent-warning)]',
  issue: 'bg-[color-mix(in_srgb,var(--accent-info)_12%,transparent)] border-[var(--accent-info)] text-[var(--accent-info)]',
  vault: 'bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] border-[var(--accent-primary)] text-[var(--accent-primary)]',
  url: 'bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)] border-[var(--accent-success)] text-[var(--accent-success)]',
}

function validateClient(type, target) {
  const v = target.trim()
  if (!v) return 'Pflichtfeld'
  if (v.length > 2000) return 'max 2000 Zeichen'
  if (type === 'url' && !URL_PATTERN.test(v)) return 'muss mit http(s):// beginnen'
  if (type === 'issue' && !ISSUE_PATTERN.test(v)) return 'Format: DD-123 / MBT-42'
  return null
}

export default function AddLinkPicker({
  onAdd,
  disabled = false,
  dataUiScope = 'add-link-picker',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(null)
  const [target, setTarget] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setOpen(false)
    setType(null)
    setTarget('')
    setError(null)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const clientErr = validateClient(type, target)
    if (clientErr) {
      setError(clientErr)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onAdd?.({ type, target: target.trim() })
      reset()
    } catch (err) {
      setError(err?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSubmitting(false)
    }
  }

  // Geschlossener Zustand: gepunkteter "+ Link hinzufügen"-Trigger (token-clean).
  if (!open) {
    return (
      <button
        type="button"
        data-ui={`${dataUiScope}.add`}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center justify-center gap-2 w-full p-2 rounded-md border-[1.5px] border-dashed border-[var(--surface1)] bg-transparent text-xs text-[var(--subtext0)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Link hinzufügen
      </button>
    )
  }

  return (
    <div
      data-ui={dataUiScope}
      className={`flex flex-col gap-2 p-2 rounded-md border border-[var(--surface0)] bg-[var(--surface0)] ${className}`}
    >
      {/* Typ-Optionen mit farbigem Icon */}
      <div data-ui={`${dataUiScope}.types`} className="flex flex-wrap gap-1">
        {LINK_TYPES.map((t) => {
          const active = type === t
          const stateClass = active
            ? ACTIVE_TYPE_CLASS[t]
            : 'bg-[var(--surface1)] border-[var(--surface0)] text-[var(--text)]'
          return (
            <button
              key={t}
              type="button"
              data-ui={`${dataUiScope}.type.${t}`}
              onClick={() => {
                setType(t)
                setError(null)
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] cursor-pointer ${stateClass}`}
            >
              <OptIcon option={t} />
              {TYPE_LABELS[t]}
            </button>
          )
        })}
      </div>

      {/* Target-Input erst nach Typ-Wahl */}
      {type && (
        <form onSubmit={handleSubmit} data-ui={`${dataUiScope}.form`} className="flex items-center gap-1.5">
          <Input
            type="text"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value)
              setError(null)
            }}
            placeholder={TYPE_PLACEHOLDERS[type]}
            aria-label={`Link-Target (${TYPE_LABELS[type]})`}
            data-ui={`${dataUiScope}.target`}
            disabled={disabled || submitting}
            maxLength={2000}
            autoFocus
            className="flex-1 min-w-[120px]"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            data-ui={`${dataUiScope}.submit`}
            loading={submitting}
            disabled={disabled || !target.trim()}
          >
            Hinzufügen
          </Button>
        </form>
      )}

      {error && (
        <span data-ui={`${dataUiScope}.error`} role="alert" className="text-[11px] text-[var(--accent-danger)]">
          {error}
        </span>
      )}

      <button
        type="button"
        data-ui={`${dataUiScope}.cancel`}
        onClick={reset}
        className="self-start p-0 bg-transparent border-0 text-[11px] text-[var(--subtext0)] cursor-pointer"
      >
        Abbrechen
      </button>
    </div>
  )
}
