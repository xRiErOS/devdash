import { Search, X } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * SearchField — Molecule (04.10 Form, GF-233). Komponiert das Input-Atom
 * (mit Such-Icon links) + einen Clear-IconButton (rechts, nur sichtbar wenn ein
 * Wert anliegt).
 *
 * Dumb-Molecule (CONV-molecule-boundary): rein präsentational, KEINE Such-/Fetch-/
 * Debounce-Logik. Vollständig controlled — `value`/`onChange` und der Reset
 * (`onClear`) kommen vom konsumierenden Organismus. Token-clean, logische
 * RTL-Utilities (pe-/end-).
 *
 * @param {object} props
 * @param {string} [props.value] - controlled Suchbegriff.
 * @param {(e:any)=>void} [props.onChange]
 * @param {()=>void} [props.onClear] - Reset-Callback (Clear-Button).
 * @param {string} [props.placeholder='Suchen…']
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className] - zusätzliche Klassen am Wrapper.
 */
export default function SearchField({
  value = '',
  onChange,
  onClear,
  placeholder = 'Suchen…',
  surface = 'transparent',
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <div data-ui="search-field" className={`relative ${className}`}>
      <Input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        surface={surface}
        leadingIcon={<Search size={16} aria-hidden="true" />}
        data-ui="search-field.input"
        className="pe-10 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {value ? (
        <IconButton
          icon={<X size={16} aria-hidden="true" />}
          label="Suche leeren"
          onClick={onClear}
          disabled={disabled}
          variant="ghost"
          size="sm"
          data-ui="search-field.clear"
          className="absolute end-1 top-1/2 -translate-y-1/2"
        />
      ) : null}
    </div>
  )
}
