/**
 * ElementRow — eine reiche Listenzeile des ElementBrowsers (Spec §4.3/§4.4).
 * Komponiert vorhandene Atoms: `Checkbox` (Selektion), `Icon` (Disclosure-Caret
 * + Typ-Icon + Prio), `EntityId` (farbcodierte ID). StatusDot via `statusTone`.
 * Nesting-Optik (indent + Caret) übernommen aus dem TreeRow-Muster.
 *
 * Presentational, props-driven — Klick-/Toggle-Logik liegt im Consumer
 * (ElementList). Das assistive Prio-Feld rendert nur, wenn gesetzt (kein
 * Leerraum für fehlende Werte).
 *
 * Keyboard: in der `ElementList` ist der Container der einzige Tab-Stop
 * (APG-Tree, aria-activedescendant) — dann setzt `tabbable={false}` die inneren
 * Controls auf `tabIndex=-1`, und `focused` zeichnet den Roving-Ring. Standalone
 * (Stories) bleibt `tabbable` true → normale Tab-Stops.
 *
 * @param {object} props
 * @param {'milestone'|'sprint'|'issue'} props.kind - EntityId-Farbe + Default-Icon
 * @param {string} [props.issueType] - feature|bug|improvement|core (Issue-Typ-Icon)
 * @param {React.ReactNode} props.entityId - z.B. 'DD2-7'
 * @param {React.ReactNode} props.title
 * @param {string} [props.status] - Lifecycle-Status → StatusDot-Farbe
 * @param {number} [props.priority] - 1–4 → P1–P4 (nur wenn gesetzt)
 * @param {0|1|2} [props.level=0] - Einrücktiefe
 * @param {'open'|'closed'|'none'} [props.caret='none'] - Disclosure-Zustand
 * @param {boolean} [props.selected=false] - Checkbox aktiv
 * @param {boolean} [props.active=false] - Zeile ist Preview-Ziel
 * @param {boolean} [props.focused=false] - Roving-Fokus (aria-activedescendant-Ziel)
 * @param {boolean} [props.tabbable=true] - false: innere Controls aus dem Tab-Flow
 * @param {string} [props.id] - DOM-id (Ziel für aria-activedescendant der Liste)
 * @param {()=>void} [props.onToggleSelect]
 * @param {()=>void} [props.onToggleCaret]
 * @param {()=>void} [props.onOpen] - Klick auf den Zeilenkörper (Preview öffnen)
 * @param {string} [props.dataUiScope='molecule.elementRow']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'
import Checkbox from '../atoms/Checkbox.jsx'
import EntityId from '../atoms/EntityId.jsx'
import { statusTone, statusLabel } from '../foundations/statusTone.js'

const INDENT = { 0: 'pl-2', 1: 'pl-6', 2: 'pl-[40px]' }
const KIND_ICON = { milestone: 'milestone', sprint: 'layers', issue: 'type-feature' }
const PRIO_ROLE = { 1: 'danger', 2: 'warning', 3: 'info', 4: 'neutral' }

export default function ElementRow({
  kind, issueType, entityId, title, status, priority,
  level = 0, caret = 'none', selected = false, active = false,
  focused = false, tabbable = true, id,
  onToggleSelect, onToggleCaret, onOpen,
  dataUiScope = 'molecule.elementRow', className = '',
}) {
  const tone = statusTone(status)
  const typeIcon = kind === 'issue' ? `type-${issueType || 'feature'}` : KIND_ICON[kind]
  const state = active ? 'bg-[var(--state-active)]' : 'hover:bg-[var(--state-hover)]'
  const ring = focused ? 'ring-2 ring-[var(--accent-primary)] ring-inset' : ''
  const innerTab = tabbable ? undefined : -1

  return (
    <div
      id={id}
      data-ui={dataUiScope}
      role="treeitem"
      aria-selected={selected}
      data-focused={focused || undefined}
      className={`group flex items-center gap-2 py-1 pr-2 rounded-sm text-[13px] text-[var(--subtext1)] ${INDENT[level] || INDENT[0]} ${state} ${ring} ${className}`}
    >
      {/* Disclosure-Caret (links vom Typ-Icon, TreeRow-Muster) */}
      {caret === 'none' ? (
        <span data-ui={`${dataUiScope}.caret-spacer`} className="w-4 shrink-0" />
      ) : (
        <button
          type="button"
          data-ui={`${dataUiScope}.caret`}
          aria-expanded={caret === 'open'}
          tabIndex={innerTab}
          onClick={onToggleCaret}
          className="w-4 shrink-0 inline-flex items-center justify-center text-[var(--overlay0)]"
        >
          <Icon name="chevron-right" size={14} mono className={caret === 'open' ? 'rotate-90 transition-transform' : 'transition-transform'} />
        </button>
      )}

      <Checkbox checked={selected} onClick={onToggleSelect} tabIndex={innerTab} dataUiScope={`${dataUiScope}.select`} className="shrink-0" />

      {/* Klickbarer Zeilenkörper öffnet die Preview */}
      <button
        type="button"
        data-ui={`${dataUiScope}.body`}
        tabIndex={innerTab}
        onClick={onOpen}
        className="flex flex-1 items-center gap-2 min-w-0 text-left"
      >
        <Icon name={typeIcon} size={14} mono className="shrink-0" />
        <EntityId kind={kind} dataUiScope={`${dataUiScope}.id`} className="text-[11px] shrink-0">{entityId}</EntityId>
        <span data-ui={`${dataUiScope}.title`} className="flex-1 min-w-0 truncate text-[var(--text)]">{title}</span>
      </button>

      {/* Assistive Felder — nur wenn gesetzt */}
      <span data-ui={`${dataUiScope}.status`} title={statusLabel(status)} className={`size-2 rounded-full shrink-0 ${tone.dot}`} />
      {priority != null && (
        <span data-ui={`${dataUiScope}.prio`} title={`P${priority}`} className="inline-flex items-center gap-0.5 shrink-0 [font-family:var(--font-display)] text-[10px] text-[var(--subtext0)]">
          <Icon name="flag" size={12} role={PRIO_ROLE[priority] || 'neutral'} />P{priority}
        </span>
      )}
    </div>
  )
}
