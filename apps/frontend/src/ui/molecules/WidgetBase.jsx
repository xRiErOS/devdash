/**
 * WidgetBase — Accordion-Container für Content-Widgets (Beschreibung, Anhänge,
 * Issues, Akzeptanzkriterien). Kopf (farbiger Dot + Titel + optional Count +
 * Aktion + Collapse-Caret) klappt den Body ein/aus.
 *
 * Komposition: nutzt das Atom `IconButton` (Caret) + `Icon`. Domänenfrei —
 * Inhalt kommt als `children`, der Hue als Token-Name. Presentational: der
 * `collapsed`-Zustand kommt von außen, der Klick wird via `onToggle` hochgereicht.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title
 * @param {'yellow'|'teal'|'green'|'mauve'|'peach'} [props.hue='yellow'] - Kopf-Ton
 * @param {React.ReactNode} [props.count] - kleiner Zähler nach dem Titel
 * @param {boolean} [props.collapsed=false]
 * @param {()=>void} [props.onToggle]
 * @param {React.ReactNode} [props.action] - Aktions-Slot rechts (z.B. IconButton)
 * @param {string} [props.dataUiScope='widget']
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children - Body-Inhalt
 */
import Icon from '../foundations/Icon.jsx'

const HUE = {
  yellow: { text: 'text-[var(--yellow)]', dot: 'bg-[var(--yellow)]' },
  teal: { text: 'text-[var(--teal)]', dot: 'bg-[var(--teal)]' },
  green: { text: 'text-[var(--green)]', dot: 'bg-[var(--green)]' },
  mauve: { text: 'text-[var(--mauve)]', dot: 'bg-[var(--mauve)]' },
  peach: { text: 'text-[var(--peach)]', dot: 'bg-[var(--peach)]' },
}

export default function WidgetBase({
  title, hue = 'yellow', count, collapsed = false, onToggle, action,
  dataUiScope = 'widget', className = '', children,
}) {
  const tone = HUE[hue] || HUE.yellow
  return (
    <div data-ui={dataUiScope} className={`flex flex-col rounded-lg border border-[var(--border)] bg-[var(--mantle)] overflow-hidden ${className}`}>
      <div data-ui={`${dataUiScope}.head`} className={`flex items-center justify-between gap-2 px-3 py-2 ${collapsed ? '' : 'border-b border-[var(--border)]'}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className={`flex flex-1 items-center gap-1.5 text-left [font-family:var(--font-display)] text-xs font-bold tracking-[0.02em] ${tone.text}`}
        >
          <span className={`size-1.5 rounded-full ${tone.dot}`} />
          {title}
          {count != null && <span className="font-semibold text-[var(--subtext0)]">· {count}</span>}
        </button>
        <div className="inline-flex items-center gap-1">
          {action}
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Ausklappen' : 'Einklappen'} data-ui={`${dataUiScope}.caret`} className="inline-flex text-[var(--subtext0)]">
            <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} size={14} mono />
          </button>
        </div>
      </div>
      {!collapsed && <div data-ui={`${dataUiScope}.body`} className="p-3">{children}</div>}
    </div>
  )
}
