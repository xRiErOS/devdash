import EntityDetailHeader from './EntityDetailHeader.jsx'

/**
 * ActiveEntityCard — prägnante Card für den aktiven Meilenstein/Sprint (D-C).
 * Basis EntityDetailHeader (ohne dessen goal-Zeile); Chevron-Toggle blendet eine eigene
 * Goal-Region ein/aus. Goal IMMER im DOM (a11y), via `hidden` kollabiert → aria-controls hat Target.
 * Layer-3-Surface inline = sanktionierte Ausnahme (Card-Primitive, kein WidgetBase-Widget; Design-I04).
 * Präsentational: open/onToggle als Props.
 */
export default function ActiveEntityCard({
  id,
  title,
  goal,
  pills = [],
  open = false,
  onToggle,
  dataUi = 'active-entity-card',
  className = '',
}) {
  const goalId = `${dataUi}-goal`
  return (
    <div
      data-ui={dataUi}
      className={`bg-[var(--layer-3)] border border-[var(--border)] rounded-[9px] overflow-hidden ${className}`}
    >
      <EntityDetailHeader
        id={id}
        title={title}
        pills={pills}
        background="transparent"
        action={
          <button
            type="button"
            data-ui={`${dataUi}.toggle`}
            aria-expanded={open ? 'true' : 'false'}
            aria-controls={goalId}
            aria-label={open ? 'Ziel einklappen' : 'Ziel ausklappen'}
            onClick={onToggle}
            className="px-1 text-[var(--subtext0)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <span data-ui={`${dataUi}.marker`} aria-hidden="true">{open ? '▾' : '▸'}</span>
          </button>
        }
      />
      <div
        id={goalId}
        data-ui={`${dataUi}.goal`}
        hidden={!open}
        className="px-3 pb-3 text-sm text-[var(--subtext0)] font-mono"
      >
        {goal}
      </div>
    </div>
  )
}
