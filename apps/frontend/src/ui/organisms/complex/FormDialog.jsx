/**
 * FormDialog — modaler Eingabe-Dialog über einem Dim-Scrim (z.B. „Neues
 * Akzeptanzkriterium"). Konkreter Organism, presentational, props-driven.
 *
 * Komposition: `IconButton` (Schließen) · `FormField` (Molecule) um `Input`/
 * `Textarea` · `SegmentedControl` (Priorität) · `Button` (Fuß-Aktionen). Alle
 * Eingaben laufen über Atome — keine rohen <input>/<button>.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title='Neues Akzeptanzkriterium']
 * @param {Array<{label:string,type:'input'|'textarea',value?:string,placeholder?:string}>} [props.fields]
 * @param {string[]} [props.prios=['P1','P2','P3','P4']]
 * @param {string} [props.priority='P2'] - aktiver Prio-Key
 * @param {string} [props.primaryLabel='Speichern']
 * @param {string} [props.dataUiScope='organism.formDialog']
 * @param {()=>void} [props.onClose]
 * @param {()=>void} [props.onSubmit]
 */
import IconButton from '../../atoms/IconButton.jsx'
import Button from '../../atoms/Button.jsx'
import FormField from '../../molecules/FormField.jsx'
import Input from '../../atoms/Input.jsx'
import Textarea from '../../atoms/Textarea.jsx'
import SegmentedControl from '../../atoms/SegmentedControl.jsx'

const DEFAULT_FIELDS = [
  { label: 'Titel', type: 'input', value: 'Regressionstest dd375 grün' },
  { label: 'Beschreibung', type: 'textarea', placeholder: 'Kurzbeschreibung des Kriteriums …' },
]

export default function FormDialog({
  title = 'Neues Akzeptanzkriterium',
  fields = DEFAULT_FIELDS,
  prios = ['P1', 'P2', 'P3', 'P4'],
  priority = 'P2',
  primaryLabel = 'Speichern',
  dataUiScope = 'organism.formDialog',
  onClose,
  onSubmit,
}) {
  return (
    <div
      data-ui={dataUiScope}
      className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--base)_45%,transparent)]"
    >
      <div
        data-ui={`${dataUiScope}.modal`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="w-[380px] max-w-full flex flex-col bg-[var(--mantle)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-pop)] overflow-hidden"
      >
        <div
          data-ui={`${dataUiScope}.head`}
          className="flex items-center justify-between p-[var(--space-3)] border-b border-[var(--border)]"
        >
          <span
            data-ui={`${dataUiScope}.title`}
            className="[font-family:var(--font-display)] text-[13px] font-bold text-[var(--text)]"
          >
            {title}
          </span>
          <IconButton iconName="close" label="Schließen" onClick={onClose} dataUiScope={`${dataUiScope}.close`} />
        </div>

        <div data-ui={`${dataUiScope}.body`} className="p-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
          {fields.map((f) => (
            <FormField key={f.label} label={f.label} dataUiScope={`${dataUiScope}.field-${f.label}`}>
              {f.type === 'textarea' ? (
                <Textarea defaultValue={f.value} placeholder={f.placeholder} dataUiScope={`${dataUiScope}.field-${f.label}.input`} />
              ) : (
                <Input defaultValue={f.value} placeholder={f.placeholder} dataUiScope={`${dataUiScope}.field-${f.label}.input`} />
              )}
            </FormField>
          ))}
          <FormField label="Priorität" dataUiScope={`${dataUiScope}.field-priority`}>
            <SegmentedControl
              options={prios.map((p) => ({ key: p, label: p }))}
              value={priority}
              dataUiScope={`${dataUiScope}.field-priority.seg`}
            />
          </FormField>
        </div>

        <div
          data-ui={`${dataUiScope}.foot`}
          className="flex justify-end gap-2 p-[var(--space-3)] border-t border-[var(--border)]"
        >
          <Button variant="ghost" onClick={onClose} dataUiScope={`${dataUiScope}.cancel`}>Abbrechen</Button>
          <Button variant="primary" onClick={onSubmit} dataUiScope={`${dataUiScope}.submit`}>{primaryLabel}</Button>
        </div>
      </div>
    </div>
  )
}
