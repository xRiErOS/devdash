/**
 * Switch — Boolean-Toggle (Atom, 03.10 Inputs). Sofort an/aus (≠ Checkbox, die
 * eine zu bestätigende Auswahl trägt). Nativer `<button role="switch">` —
 * Tastatur (Space/Enter) + Fokus gratis. Track + Thumb, checked = --accent-primary.
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex. Farben via Tailwind-v4-Arbitrary-Tokens.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe. `...rest` forwardet
 * (eigenes data-ui überschreibt den Default).
 *
 * @param {object} props
 * @param {boolean} [props.checked=false]
 * @param {(next:boolean, e:any)=>void} [props.onChange] - erhält den neuen Wert
 * @param {boolean} [props.disabled=false]
 * @param {'sm'|'md'} [props.size='md']
 * @param {import('react').ReactNode} [props.label] - optionales Label rechts
 * @param {string} [props.className]
 */
const TRACK = { sm: 'w-7 h-4', md: 'w-9 h-5' }
// Thumb-Off-Position = Track-Innenrand; checked verschiebt um Track-Breite − Thumb − 2×Inset.
const THUMB = { sm: 'w-3 h-3', md: 'w-4 h-4' }
const TRANSLATE = { sm: 'translate-x-3', md: 'translate-x-4' }

export default function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className = '',
  ...rest
}) {
  const track = TRACK[size] || TRACK.md
  const thumb = THUMB[size] || THUMB.md
  const translate = TRANSLATE[size] || TRANSLATE.md

  return (
    <label className={`inline-flex items-center gap-2 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => onChange?.(!checked, e)}
        data-ui="switch"
        className={`relative inline-flex shrink-0 items-center rounded-full ps-px pe-px transition-colors duration-[var(--duration-fast)] ease-standard focus-visible:outline-none focus-visible:ring-[length:var(--border-width-l)] focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--base)] disabled:cursor-not-allowed ${track} ${checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--overlay0)]'}`}
        {...rest}
      >
        <span
          aria-hidden
          className={`pointer-events-none inline-block rounded-full bg-[var(--on-accent)] transition-transform duration-[var(--duration-fast)] ease-standard ${thumb} ${checked ? translate : 'translate-x-0'}`}
        />
      </button>
      {label && <span className="text-sm text-[var(--text)]">{label}</span>}
    </label>
  )
}
