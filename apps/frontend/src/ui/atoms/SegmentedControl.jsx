/**
 * SegmentedControl — exklusive Umschalt-Gruppe (z.B. Struktur ↔ Backlog).
 * Props-driven; rendert echte <button>s. Optionales Icon je Segment.
 *
 * @param {object} props
 * @param {Array<{key:string,label:React.ReactNode,iconName?:string}>} props.options
 * @param {string} props.value - aktiver key
 * @param {(key:string)=>void} [props.onChange]
 * @param {string} [props.dataUiScope='segmented']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'

export default function SegmentedControl({ options = [], value, onChange, dataUiScope = 'segmented', className = '', ...rest }) {
  return (
    <div
      data-ui={dataUiScope}
      role="tablist"
      className={`flex p-0.5 rounded-md bg-[var(--base)] border border-[var(--border)] ${className}`}
      {...rest}
    >
      {options.map((o) => {
        const active = o.key === value
        const tone = active ? 'bg-[var(--surface1)] text-[var(--text)]' : 'text-[var(--subtext0)]'
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-ui={`${dataUiScope}.${o.key}`}
            onClick={() => onChange?.(o.key)}
            className={`flex-1 inline-flex items-center justify-center gap-[5px] px-2 py-[3px] rounded-sm [font-family:var(--font-display)] text-[11px] ${tone}`}
          >
            {o.iconName && <Icon name={o.iconName} size={13} mono />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
