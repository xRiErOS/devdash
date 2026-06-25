import { Check, Minus } from 'lucide-react'

/**
 * Checkbox — token-saubere Catppuccin-Checkbox (DevDash-Design).
 * appearance-none auf dem echten Native-Input (Accessibility bleibt) + Custom-Box
 * + zentriertes Check-/Minus-Icon. Kein inline-style, nur var(--token)-Klassen.
 * Props-driven, kein Store/Fetch, keine Domaenen-Begriffe. `...rest` forwardet
 * data-ui/name an den Input.
 *
 * @param {object} props
 * @param {boolean} [props.checked=false]
 * @param {(e:any)=>void} [props.onChange]
 * @param {import('react').ReactNode} [props.label] - optionales Label rechts
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.indeterminate=false] - visueller Misch-Zustand (Minus)
 * @param {'sm'|'md'} [props.size='md']
 * @param {string} [props.className]
 */
const BOX = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4' }
const ICON = { sm: 11, md: 13 }

export default function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  indeterminate = false,
  size = 'md',
  className = '',
  'data-ui': dataUi = 'checkbox',
  ...rest
}) {
  const box = BOX[size] || BOX.md
  const iconSize = ICON[size] || ICON.md
  return (
    // data-ui am sichtbaren <label>-Root (nicht am appearance-none-Input), damit
    // jede Story-Variante am sichtbaren Element 1:1 ansprechbar ist (I01).
    <label data-ui={dataUi} className={`inline-flex items-center gap-2 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <span className={`relative inline-flex shrink-0 ${box}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-checked={indeterminate ? 'mixed' : checked}
          className={`peer appearance-none ${box} rounded-sm border border-[var(--overlay0)] bg-[var(--base)] checked:bg-[var(--accent-primary)] checked:border-[var(--accent-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] transition`}
          {...rest}
        />
        {indeterminate ? (
          <Minus size={iconSize} className="pointer-events-none absolute inset-0 m-auto text-[var(--on-accent)]" />
        ) : (
          <Check size={iconSize} className="pointer-events-none absolute inset-0 m-auto text-[var(--on-accent)] opacity-0 peer-checked:opacity-100" />
        )}
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}
