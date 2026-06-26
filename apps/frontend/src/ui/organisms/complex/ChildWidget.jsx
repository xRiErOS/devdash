/**
 * ChildWidget — Liste der Kind-Issues (z.B. Issues eines Sprints, Sprints eines
 * Milestones). Volle Breite im Content-Grid. Konkreter Organism.
 *
 * Komposition: `WidgetBase` + `ListItem` (Molecule) + `EntityId` + `StatusDot`
 * (Atome) + `Icon` (Issue-Typ). Presentational, props-driven.
 *
 * @param {object} props
 * @param {Array<{id:string,type?:string,kind?:string,name:string,status:string,statusLabel?:string}>} [props.items=[]]
 * @param {string} [props.title='Issues']
 * @param {boolean} [props.collapsed]
 * @param {()=>void} [props.onToggle]
 * @param {string} [props.dataUiScope='organism.widget.children']
 */
import WidgetBase from '../../molecules/WidgetBase.jsx'
import ListItem from '../../molecules/ListItem.jsx'
import EntityId from '../../atoms/EntityId.jsx'
import StatusDot from '../../atoms/StatusDot.jsx'
import IconButton from '../../atoms/IconButton.jsx'
import Icon from '../../foundations/Icon.jsx'

// Issue-Typ → Registry-Icon. ISSUE_TYPES = bug|feature|improvement|core
// (kein eigenes type-core-Glyph → core nutzt type-chore, semantisch am nächsten).
const TYPE_ICON = { bug: 'type-bug', feature: 'type-feature', improvement: 'type-improvement', core: 'type-chore' }

export default function ChildWidget({ items = [], title = 'Issues', collapsed, onToggle, dataUiScope = 'organism.widget.children' }) {
  return (
    <WidgetBase
      title={title}
      count={items.length}
      collapsed={collapsed}
      onToggle={onToggle}
      dataUiScope={dataUiScope}
      className="md:col-span-2"
      action={<IconButton iconName="add" label="Anlegen" size="sm" dataUiScope={`${dataUiScope}.add`} />}
    >
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <ListItem key={it.id} grip dataUiScope={`${dataUiScope}.row-${it.id}`}>
            <EntityId kind={it.kind || 'issue'} dataUiScope={`${dataUiScope}.row-${it.id}.id`}>{it.id}</EntityId>
            {it.type && <Icon name={TYPE_ICON[it.type] || 'type-chore'} size={15} mono />}
            <span className="flex-1 min-w-0 text-[13px] text-[var(--text)] truncate">{it.name}</span>
            <StatusDot status={it.status} label={it.statusLabel} dataUiScope={`${dataUiScope}.row-${it.id}.status`} />
          </ListItem>
        ))}
      </div>
    </WidgetBase>
  )
}
