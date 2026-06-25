import { X, Plus } from 'lucide-react'
import Pill from '../atoms/Pill.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import Button from '../atoms/Button.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Stack from '../layout/Stack.jsx'
import WidgetBase from './WidgetBase.jsx'

/**
 * DependencyWidget — Organism (05.30 Detail, OR-19, GF-254). Zeigt die
 * Abhängigkeiten einer Entität in zwei Sektionen: Vorgänger (blockers, „hängt ab
 * von") und Nachfolger (blocked_by, „blockiert"). Jedes Item ist klickbar
 * (`onNavigate` → Dependency/Detail-Page) und optional entfernbar (`onRemove`, unlink).
 *
 * Präsentational (CONV-molecule-boundary): Listen + Callbacks vom Consumer; das
 * Widget rendert nur. OR-19 = 6 Caps (dependency-list, dependency-graph,
 * milestone-read, milestone-dep-add/list/remove; Ebene 6).
 *
 * @param {object} props
 * @param {string} [props.title='Abhängigkeiten']
 * @param {Array<{key:string,label?:import('react').ReactNode,status?:string}>} [props.predecessors] - Vorgänger (blockers).
 * @param {Array<{key:string,label?:import('react').ReactNode,status?:string}>} [props.successors] - Nachfolger (blocked_by).
 * @param {boolean} [props.removable=false] - zeigt Unlink-Trigger je Item.
 * @param {(key:string, direction:'predecessor'|'successor')=>void} [props.onRemove]
 * @param {(key:string)=>void} [props.onNavigate]
 * @param {import('react').ReactNode} [props.heading] - optionaler Self-Title (GF-2 Wave-4):
 *   gesetzt → WidgetBase rendert WidgetHeading (Dot + `--heading-accent`, KEIN `// `-Slash)
 *   ÜBER den Vorgänger/Nachfolger-Sektionen. KEINE Action am Top (der „add"-Trigger bleibt
 *   per T6 in der Vorgänger-Header-Zeile). Fehlt der Prop → headless WidgetBase (kein
 *   self-title), back-compat für Slot-getriebene Kompositionen.
 * @param {()=>void} [props.onAdd] - gesetzt → Ghost-„add"-IconButton oben rechts (öffnet
 *   das DependencyForm beim Consumer, GF-302).
 * @param {string} [props.addLabel='Abhängigkeit hinzufügen']
 * @param {'cluster'|'grid'} [props.itemLayout='cluster'] - Item-Anordnung (GF-303):
 *   `cluster` = inline-fließend; `grid` = ausgerichtetes 3-Spalten-Raster
 *   (ID | Name | Status), gleichmäßig + clean.
 * @param {import('react').ReactNode} [props.emptyHint='Keine Abhängigkeiten.']
 * @param {string} [props.className]
 */
export default function DependencyWidget({
  title = 'Abhängigkeiten',
  heading,
  predecessors = [],
  successors = [],
  removable = false,
  onRemove,
  onNavigate,
  onAdd,
  addLabel = 'Abhängigkeit hinzufügen',
  itemLayout = 'cluster',
  emptyHint = 'Keine Abhängigkeiten.',
  className = '',
}) {
  const isEmpty = predecessors.length === 0 && successors.length === 0
  const innerLayout = itemLayout === 'grid'
    ? 'grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 text-left'
    : 'flex min-w-0 items-center gap-2'

  const renderItem = (dep, direction) => (
    <div key={dep.key} data-ui={`dependency-widget.item-${dep.key}`} className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate?.(dep.key)}
        className="min-h-[44px] min-w-0 grow justify-start gap-2 px-1"
        data-ui={`dependency-widget.nav-${dep.key}`}
      >
        <span className={innerLayout}>
          <Pill color="info" size="sm" appearance="tint">{dep.key}</Pill>
          <span className="truncate text-xs text-[var(--text)]">{dep.label}</span>
          {dep.status ? <StatusBadge status={dep.status} appearance="tint" /> : <span aria-hidden="true" />}
        </span>
      </Button>
      {removable && (
        <IconButton
          icon={<X size={14} aria-hidden="true" />}
          label={`${dep.key} entfernen`}
          variant="ghost"
          size="sm"
          onClick={() => onRemove?.(dep.key, direction)}
          reveal
          data-ui={`dependency-widget.remove-${dep.key}`}
        />
      )}
    </div>
  )

  // T6 (PO-Review): „add" rendert rechtsbündig IN der Sektions-Header-Zeile statt in
  // einer eigenen Toolbar-Zeile darüber (spart vertikalen Whitespace). Wenn Vorgänger
  // existieren, teilt sich der add die predecessors-Header-Zeile; sonst fällt er in die
  // Titel-/Empty-Header-Zeile zurück, damit die Affordanz stets erreichbar bleibt.
  const addButton = onAdd ? (
    <IconButton
      icon={<Plus size={14} aria-hidden="true" />}
      label={addLabel}
      variant="ghost"
      size="sm"
      onClick={onAdd}
      reveal
      data-ui="dependency-widget.add"
    />
  ) : null

  const renderSection = (label, items, direction, anchor, headerAction = null) => (
    <div data-ui={`dependency-widget.${anchor}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--text)]">{label}</span>
        {headerAction}
      </div>
      <Stack gap="xs" className="mt-1">
        {items.map((dep) => renderItem(dep, direction))}
      </Stack>
    </div>
  )

  const hasPred = predecessors.length > 0
  // add wandert in die predecessors-Header-Zeile, sobald Vorgänger existieren; sonst
  // bleibt er in der Titel-/Empty-Zeile (kein Duplikat).
  const titleRowAction = hasPred ? null : addButton

  return (
    <WidgetBase heading={heading} dataUi="dependency-widget" className={className}>
      <Stack gap="sm">
        {(title || titleRowAction) && (
          <div className="flex items-center justify-between gap-2">
            {title ? (
              <h3 data-ui="dependency-widget.title" className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text)]">
                {title}
              </h3>
            ) : <span />}
            {titleRowAction}
          </div>
        )}
        {isEmpty ? (
          <p data-ui="dependency-widget.empty-hint" className="text-xs text-[var(--subtext0)]">
            {emptyHint}
          </p>
        ) : (
          <Stack gap="md">
            {hasPred && renderSection('Vorgänger', predecessors, 'predecessor', 'predecessors', addButton)}
            {successors.length > 0 && renderSection('Nachfolger', successors, 'successor', 'successors')}
          </Stack>
        )}
      </Stack>
    </WidgetBase>
  )
}
