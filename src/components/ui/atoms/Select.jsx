import { ChevronDown } from 'lucide-react'

/**
 * Select — Atom (kanonisch, token-clean). Dropdown-Auswahl als drittes Inputs-
 * Atom neben Input (Text) und Checkbox (Boolean) — PO 2026-06-16 (Inputs-Trias).
 *
 * Gestyltes Native-<select> (appearance-none + Custom-Chevron) — Accessibility +
 * mobile Native-Picker bleiben. Token-clean: 0 inline-style, 0 Raw-Hex, Farben via
 * Tailwind-v4-Arbitrary-Tokens. font-size 16px (text-base) gegen iOS-Zoom.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe; `...rest` forwardet
 * data-ui/name/value/onChange ans Native-Element.
 *
 * @param {object} props
 * @param {Array<string|{value:string,label:React.ReactNode}>} props.options
 * @param {string} [props.placeholder] - disabled Leeroption als Prompt (value="")
 * @param {boolean} [props.invalid=false] - Fehlerzustand (aria-invalid + Danger-Outline)
 * @param {boolean} [props.disabled=false]
 * @param {'sm'|'md'} [props.size='md']
 * @param {React.ReactNode} [props.leadingIcon]
 * @param {string} [props.className]
 */
const SIZE = {
  sm: 'text-sm py-1.5 pe-8',
  md: 'text-base py-2 pe-9',
}

export default function Select({
  options = [],
  placeholder,
  invalid = false,
  disabled = false,
  size = 'md',
  leadingIcon,
  className = '',
  ...rest
}) {
  const sizeCls = SIZE[size] || SIZE.md
  const field = (
    <span className="relative inline-flex items-center w-full">
      {leadingIcon && (
        <span data-ui="select.icon" className="pointer-events-none absolute start-2.5 flex items-center text-[var(--subtext0)]">
          {leadingIcon}
        </span>
      )}
      <select
        data-ui="select"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={`w-full appearance-none rounded-lg ps-3 ${sizeCls} ${leadingIcon ? 'ps-9' : ''} border-0 outline-none bg-[var(--surface0)] text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:outline aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-[var(--accent-danger)] ${className}`}
        {...rest}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value
          const label = typeof opt === 'string' ? opt : opt.label
          return <option key={value} value={value}>{label}</option>
        })}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute end-2.5 text-[var(--subtext0)]" />
    </span>
  )
  return field
}
