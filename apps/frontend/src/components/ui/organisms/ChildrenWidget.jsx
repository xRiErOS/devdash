import { useState } from 'react'
import WidgetBase from './WidgetBase.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import AccordionRow from '../molecules/AccordionRow.jsx'

/**
 * ChildrenWidget — Organism (05.30 Widgets, OR-22, GF-257 · GF-2 WidgetBase-Canon).
 * Listet die Kinder einer Entität als Accordion: Milestone → Sprints, Sprint → Issues,
 * Issue → SubTasks. Jede Zeile (komponiert AccordionRow, GF-240) klappt ein Panel mit dem
 * Kind-Detail auf. Klick auf den Titel toggelt; `onNavigate` springt zur Detail-Page.
 *
 * WidgetBase-Shell (Wave-4): Layer-3-Fill (--layer-3) + --border + Radius/Padding aus
 * WidgetBase (EINZIGE Fill-Quelle, D-QC1). Self-titled via `heading` (opt-in → WidgetHeading,
 * Dot + --heading-accent, KEIN `// `-Slash; ersetzt das frühere CommentLabel-Titel-Modell, D-C).
 * Titellos per Default (der AccordionBody-Slot stellt den Titel, D02/#4). Count-Metrik
 * unten-rechts. Mono (--font-display). Organism: hält den Aufklapp-Zustand; sonst
 * präsentational (items + Callbacks vom Consumer).
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.heading] - opt-in Self-Title (WidgetHeading, Dot + heading-accent); fehlt → titellos.
 * @param {string} [props.childLabel='Kinder'] - Plural-Label der Kind-Ebene (z.B. 'Sprints'); Count-Metrik.
 * @param {Array<{key:string,label:import('react').ReactNode,status?:string,
 *   panel?:import('react').ReactNode}>} [props.items] - Kind-Einträge.
 * @param {string|null} [props.defaultOpenKey=null] - initial offene Zeile (Story/SSR).
 * @param {(key:string)=>void} [props.onToggle]
 * @param {(key:string)=>void} [props.onNavigate] - gesetzt → Klick auf den Zeilen-Titel
 *   navigiert zur Detail-Page des Kindes (GF-296, AccordionRow-Split-Modus); das Chevron toggelt.
 * @param {import('react').ReactNode} [props.emptyHint='Keine untergeordneten Einträge.']
 * @param {string} [props.dataUiScope='children-widget'] - Wurzel-data-ui-Bereich.
 * @param {string} [props.className]
 */
export default function ChildrenWidget({
  heading,
  childLabel = 'Kinder',
  items = [],
  defaultOpenKey = null,
  onToggle,
  onNavigate,
  emptyHint = 'Keine untergeordneten Einträge.',
  dataUiScope = 'children-widget',
  className = '',
}) {
  const [openKey, setOpenKey] = useState(defaultOpenKey)

  const toggle = (key) => {
    setOpenKey((cur) => (cur === key ? null : key))
    onToggle?.(key)
  }

  return (
    <WidgetBase
      heading={heading}
      dataUi={dataUiScope}
      className={`[font-family:var(--font-display)] ${className}`}
    >
      {items.length === 0 ? (
        <p data-ui={`${dataUiScope}.empty-hint`} className="text-[12px] text-[var(--subtext0)]">
          {emptyHint}
        </p>
      ) : (
        <div>
          {items.map((item) => (
            <AccordionRow
              key={item.key}
              open={openKey === item.key}
              onToggle={() => toggle(item.key)}
              onTitleActivate={onNavigate ? () => onNavigate(item.key) : undefined}
              panelId={`${dataUiScope}-panel-${item.key}`}
              title={
                <span className="inline-flex w-full items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.status && <StatusBadge status={item.status} />}
                </span>
              }
              data-ui={`${dataUiScope}.item-${item.key}`}
            >
              {item.panel}
            </AccordionRow>
          ))}
        </div>
      )}
      <div
        data-ui={`${dataUiScope}.metrics`}
        className="mt-3 flex items-center justify-end gap-4 text-[11px] text-[var(--subtext0)]"
      >
        <span data-ui={`${dataUiScope}.count`} className="tabular-nums">
          {items.length} {childLabel}
        </span>
      </div>
    </WidgetBase>
  )
}
