/**
 * ListItem — generische Listenzeile (Shell für ChildWidget/ChecklistWidget).
 * Rahmen + optionaler Drag-Grip; der eigentliche Zeileninhalt kommt als
 * `children` (EntityId/Icon/Name/StatusDot oder Checkbox).
 *
 * Komposition: nutzt `Icon` (Grip). Presentational, props-driven. Das
 * Durchstreichen (`struck`) macht der Consumer am Namen — hier nur als
 * `data-struck`-Hinweis weitergereicht (Regel: children-basiert, simpel).
 *
 * @param {object} props
 * @param {boolean} [props.grip=false] - führender Drag-Grip
 * @param {boolean} [props.active=false] - aktiver/ausgewählter Zustand
 * @param {boolean} [props.struck=false] - Hinweis: Name durchgestrichen
 * @param {string} [props.dataUiScope='molecule.listItem']
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children - Zeileninhalt
 */
import Icon from '../foundations/Icon.jsx'

export default function ListItem({
  grip = false, active = false, struck = false,
  dataUiScope = 'molecule.listItem', className = '', children,
}) {
  const bg = active ? 'bg-[var(--state-active)]' : 'bg-[var(--base)]'
  return (
    <div
      data-ui={dataUiScope}
      data-struck={struck || undefined}
      className={`flex items-center gap-2 p-2 rounded-md border border-[var(--border)] ${bg} ${className}`}
    >
      {grip && (
        <span data-ui={`${dataUiScope}.grip`} className="flex text-[var(--overlay0)] cursor-grab">
          <Icon name="drag" size={14} mono />
        </span>
      )}
      {children}
    </div>
  )
}
