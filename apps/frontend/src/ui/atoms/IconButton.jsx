/**
 * IconButton — Icon-only-Aktion (Tool/Toggle): Edit, Close, Filter, Expand …
 * Häufigstes Atom der Shell. Rendert ein echtes <button> mit einem Registry-Icon
 * (inherit-Farbe). `on` markiert den aktiven/getoggelten Zustand.
 *
 * @param {object} props
 * @param {string} props.iconName - Registry-Key
 * @param {string} props.label - aria-label (Icon-only ist bedeutungstragend)
 * @param {boolean} [props.on=false] - aktiv/getoggelt (Akzentfarbe)
 * @param {'md'|'sm'} [props.size='md'] - Box-Größe (30px | 20px)
 * @param {string} [props.dataUiScope='iconButton']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'

const BOX = { md: 'size-[30px]', sm: 'size-[20px]' }
const GLYPH = { md: 16, sm: 13 }

export default function IconButton({ iconName, label, on = false, size = 'md', dataUiScope = 'iconButton', className = '', ...rest }) {
  const tone = on ? 'bg-[var(--state-active)] text-[var(--accent-primary)]' : 'text-[var(--subtext0)] hover:bg-[var(--state-hover)]'
  return (
    <button
      type="button"
      data-ui={dataUiScope}
      aria-pressed={on}
      title={label}
      className={`inline-flex items-center justify-center rounded-md ${BOX[size] || BOX.md} ${tone} ${className}`}
      {...rest}
    >
      <Icon name={iconName} size={GLYPH[size] || GLYPH.md} label={label} inherit />
    </button>
  )
}
