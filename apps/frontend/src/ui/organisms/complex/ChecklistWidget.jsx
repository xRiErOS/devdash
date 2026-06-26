/**
 * ChecklistWidget — abhakbare Kriterien (Akzeptanzkriterien / DoD-Items). Volle
 * Breite im Content-Grid. Konkreter Organism.
 *
 * Komposition: `WidgetBase` + `ListItem` (Molecule) + `Checkbox` + `IconButton`
 * (Atome). Presentational, props-driven. Items normalisiert auf `{id,name,done}`
 * (Subtask status open|done bzw. DoD done:0|1).
 *
 * @param {object} props
 * @param {Array<{id:string,name:string,done:boolean}>} [props.items=[]]
 * @param {string} [props.title='Akzeptanzkriterien']
 * @param {boolean} [props.collapsed]
 * @param {()=>void} [props.onToggle]
 * @param {string} [props.dataUiScope='organism.widget.checklist']
 */
import WidgetBase from '../../molecules/WidgetBase.jsx'
import ListItem from '../../molecules/ListItem.jsx'
import Checkbox from '../../atoms/Checkbox.jsx'
import IconButton from '../../atoms/IconButton.jsx'

export default function ChecklistWidget({ items = [], title = 'Akzeptanzkriterien', collapsed, onToggle, dataUiScope = 'organism.widget.checklist' }) {
  const open = items.filter((i) => !i.done).length
  return (
    <WidgetBase
      title={title}
      count={`${open} offen`}
      collapsed={collapsed}
      onToggle={onToggle}
      dataUiScope={dataUiScope}
      className="md:col-span-2"
      action={<IconButton iconName="add" label="Kriterium hinzufügen" size="sm" dataUiScope={`${dataUiScope}.add`} />}
    >
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <ListItem key={it.id} grip struck={it.done} dataUiScope={`${dataUiScope}.row-${it.id}`}>
            <Checkbox checked={it.done} dataUiScope={`${dataUiScope}.row-${it.id}.check`} />
            <span className="[font-family:var(--font-display)] text-[11px] font-semibold text-[var(--subtext0)]">{it.id}</span>
            <span className={`flex-1 min-w-0 text-[13px] truncate ${it.done ? 'line-through text-[var(--subtext0)]' : 'text-[var(--text)]'}`}>{it.name}</span>
          </ListItem>
        ))}
      </div>
    </WidgetBase>
  )
}
