/**
 * Button — Aktions-Atom (primary | ghost), optional mit führendem Icon.
 * Rendert ein echtes <button>; der Consumer nutzt nie ein rohes <button>.
 * Props-driven, kein Verhalten/Store.
 *
 * @param {object} props
 * @param {'primary'|'ghost'} [props.variant='primary']
 * @param {'md'|'sm'} [props.size='md'] - Box-/Schriftgröße. `sm`=11px (passt zu
 *   SegmentedControl-Segmenten), `md`=12px (Default).
 * @param {string} [props.iconName] - Registry-Key für ein führendes Icon (inherit-Farbe)
 * @param {React.ReactNode} props.children
 * @param {string} [props.dataUiScope='button']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'

const VARIANT = {
  primary: 'bg-[var(--accent-primary)] text-[var(--base)] border border-transparent',
  ghost: 'text-[var(--subtext1)] border border-[var(--border)]',
}

const SIZE = {
  md: 'px-3 py-[5px] text-xs',
  sm: 'px-2.5 py-1 text-[11px]',
}
const GLYPH = { md: 14, sm: 13 }

export default function Button({ variant = 'primary', size = 'md', iconName, children, dataUiScope = 'button', className = '', ...rest }) {
  return (
    <button
      type="button"
      data-ui={dataUiScope}
      className={`inline-flex items-center gap-1.5 rounded-md [font-family:var(--font-display)] font-semibold cursor-pointer ${SIZE[size] || SIZE.md} ${VARIANT[variant] || VARIANT.primary} ${className}`}
      {...rest}
    >
      {iconName && <Icon name={iconName} size={GLYPH[size] || GLYPH.md} inherit />}
      {children}
    </button>
  )
}
