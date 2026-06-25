import { useState } from 'react'
import { Plus } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * ChecklistInputForm — generisches Quick-Add-Eingabeform für Checklisten-artige
 * Domänen (DD-481, T12). Verallgemeinert das fertige Design von
 * `project-home.todos.input.form` (vormals TodoInput) und trägt es 1:1 über:
 * Enter-Submit auf einem transparenten Input-Feld + Plus-IconButton als
 * eigenständige Submit-Box daneben.
 *
 * VARIANTEN (`variant`): nur Beschriftung/Platzhalter/aria unterscheiden sich —
 * Aufbau, Tokens und Verhalten sind identisch:
 *   - `todo` → ToDo-Erfassung (Project-Home Todos-Tab)
 *   - `dod`  → Definition-of-Done-Kriterien (Milestone-Details)
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/useEffect-Datenladen. Mutation
 * läuft über `onCreate(label)`. Ephemerer Draft (`value`) bleibt lokal.
 *
 * Token-clean: 0 Inline-Styles, 0 Raw-Hex. font-size 16px (text-base via
 * Input-Atom) gegen iOS-Zoom beibehalten.
 *
 * data-ui (I03): spiegelt die Ist-Repo-Form `<scope>.form` / bare `<scope>` /
 * `<scope>.small` (Add-Button als eigene Box, #10/#12).
 *
 * @param {object} props
 * @param {'todo'|'dod'} [props.variant='todo'] - Beschriftungs-Preset
 * @param {(label:string)=>(void|Promise<void>)} props.onCreate - Mutations-Callback bei Submit
 * @param {()=>void} [props.onOpenFull] - Wenn gesetzt: Small-Button öffnet Vollerfassungs-Modal statt zu submitten
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.placeholder] - überschreibt den Varianten-Platzhalter
 * @param {string} [props.dataUiScope='checklist-input'] - Wurzel-data-ui-bereich
 * @param {string} [props.rootDataUi] - DD-500: wenn gesetzt, trägt das WURZEL-Element
 *   (form) exakt diesen `data-ui`-Wert (semantischer Plugin-Anker, z.B.
 *   `plugin.todo.quick-add`) statt des `${dataUiScope}.form`-Default. Kinder-Anker
 *   (input/small) bleiben `${dataUiScope}…`. Unset → unverändertes Verhalten.
 * @param {string} [props.inputTestId] - optional data-testid forwarded to the text input
 *   (e.g. 'dod-add-input'). When undefined, no data-testid attribute is emitted.
 * @param {string} [props.submitTestId] - optional data-testid forwarded to the submit button
 *   (e.g. 'dod-add-button'). When undefined, no data-testid attribute is emitted.
 */

const VARIANTS = {
  todo: { placeholder: 'Neues ToDo (Enter zum Speichern)…', ariaLabel: 'Neues ToDo eingeben' },
  dod: { placeholder: 'Neues DoD-Item…', ariaLabel: 'Neues DoD-Item eingeben' },
}

export default function ChecklistInputForm({
  variant = 'todo',
  onCreate,
  onOpenFull,
  disabled = false,
  placeholder,
  dataUiScope = 'checklist-input',
  rootDataUi = `${dataUiScope}.form`,
  inputTestId,
  submitTestId,
}) {
  const preset = VARIANTS[variant] ?? VARIANTS.todo
  const ph = placeholder ?? preset.placeholder
  const [value, setValue] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const trimmed = value.trim()
    if (!trimmed) return
    setValue('')
    try {
      await onCreate?.(trimmed)
    } catch {
      setValue(trimmed)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-ui={`${rootDataUi}`}
      className="flex items-center gap-2"
    >
      <div className="flex-1 min-w-0">
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={ph}
          aria-label={preset.ariaLabel}
          data-ui={dataUiScope}
          disabled={disabled}
          maxLength={280}
          leadingIcon={<Plus size={16} strokeWidth={2} aria-hidden="true" />}
          className="min-h-11"
          {...(inputTestId !== undefined ? { 'data-testid': inputTestId } : {})}
        />
      </div>
      <IconButton
        type={onOpenFull ? 'button' : 'submit'}
        size="lg"
        icon={<Plus size={16} strokeWidth={2} aria-hidden="true" />}
        label="Add"
        variant="primary"
        disabled={disabled || (!onOpenFull && !value.trim())}
        onClick={onOpenFull || undefined}
        className="shrink-0"
        data-ui={`${dataUiScope}.small`}
        {...(submitTestId !== undefined ? { 'data-testid': submitTestId } : {})}
      />
    </form>
  )
}
