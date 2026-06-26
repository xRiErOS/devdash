/**
 * Checkbox — abhakbares Kontrollkästchen (z.B. Akzeptanzkriterien).
 * Rendert ein echtes <button role="checkbox">; der Haken ist ein Registry-Icon
 * (kein CSS-::after-Trick). Props-driven.
 *
 * @param {object} props
 * @param {boolean} [props.checked=false]
 * @param {React.ReactNode} [props.label] - optionaler Text rechts der Box
 * @param {string} [props.dataUiScope='checkbox']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'

export default function Checkbox({ checked = false, label, dataUiScope = 'checkbox', className = '', ...rest }) {
  const box = checked
    ? 'bg-[var(--green)] border-[var(--green)] text-[var(--base)]'
    : 'border-[var(--overlay1)] text-transparent'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-ui={dataUiScope}
      className={`inline-flex items-center gap-2 ${className}`}
      {...rest}
    >
      <span data-ui={`${dataUiScope}.box`} className={`inline-flex items-center justify-center size-4 rounded-sm border ${box}`}>
        {checked && <Icon name="check" size={12} inherit />}
      </span>
      {label && <span className="text-sm text-[var(--text)]">{label}</span>}
    </button>
  )
}
