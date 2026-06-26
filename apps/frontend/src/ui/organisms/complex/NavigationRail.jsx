/**
 * NavigationRail — vertikale Haupt-Navigation der Shell. Zwei Zustände über
 * `wide`: schmal/icon-only (Default) ↔ breit/mit-Labels. Kopf trägt den
 * Klapp-Toggle, Fuß-Items sitzen unten (über einen Spacer abgesetzt).
 *
 * Komposition: schmal nutzt `IconButton` je Item (on = aktiv); breit rendert
 * Label-Zeilen mit `Icon` + Akzent-Tick links für den aktiven Eintrag.
 * Presentational, props-driven. Item-`key` ist zugleich der Registry-Icon-Key.
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,active?:boolean,onClick?:Function}>} [props.items=[]]
 * @param {Array<{key:string,label:string,onClick?:Function}>} [props.footItems=[]]
 * @param {boolean} [props.wide=false]
 * @param {string} [props.dataUiScope='organism.nav']
 */
import Icon from '../../foundations/Icon.jsx'
import IconButton from '../../atoms/IconButton.jsx'

function WideItem({ item, active = false, dataUiScope }) {
  const tone = active
    ? 'bg-[var(--state-active)] text-[var(--accent-primary)]'
    : 'text-[var(--subtext0)] hover:bg-[var(--state-hover)]'
  return (
    <button
      type="button"
      data-ui={dataUiScope}
      onClick={item.onClick}
      className={`relative flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[7px] rounded-md [font-family:var(--font-display)] text-[13px] ${tone}`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-0.5 top-2 bottom-2 w-0.5 rounded-sm bg-[var(--accent-primary)]"
        />
      )}
      <Icon name={item.key} size={18} role={active ? 'primary' : undefined} mono={!active} />
      {item.label}
    </button>
  )
}

export default function NavigationRail({
  items = [],
  footItems = [],
  wide = false,
  dataUiScope = 'organism.nav',
}) {
  if (wide) {
    return (
      <div
        data-ui={dataUiScope}
        className="w-[196px] flex flex-col border-r border-[var(--border)] bg-[var(--mantle)]"
      >
        <div
          data-ui={`${dataUiScope}.head`}
          className="flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)] border-b border-[var(--border)]"
        >
          <span className="[font-family:var(--font-display)] text-[12px] font-bold text-[var(--text)]">
            Navigation
          </span>
          <IconButton iconName="chevron-left" label="Einklappen" dataUiScope={`${dataUiScope}.toggle`} />
        </div>
        <div data-ui={`${dataUiScope}.body`} className="flex-1 flex flex-col items-stretch gap-[var(--space-2)] p-[var(--space-2)]">
          {items.map((it) => (
            <WideItem key={it.key} item={it} active={it.active} dataUiScope={`${dataUiScope}.item-${it.key}`} />
          ))}
          <div className="flex-1" />
          {footItems.map((it) => (
            <WideItem key={it.key} item={it} dataUiScope={`${dataUiScope}.foot-${it.key}`} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div
      data-ui={dataUiScope}
      className="w-14 flex flex-col border-r border-[var(--border)] bg-[var(--mantle)]"
    >
      <div
        data-ui={`${dataUiScope}.head`}
        className="flex items-center justify-center px-[var(--space-3)] py-[var(--space-2)] border-b border-[var(--border)]"
      >
        <IconButton iconName="chevron-right" label="Erweitern" dataUiScope={`${dataUiScope}.toggle`} />
      </div>
      <div data-ui={`${dataUiScope}.body`} className="flex-1 flex flex-col items-center gap-[var(--space-2)] py-[var(--space-3)]">
        {items.map((it) => (
          <IconButton
            key={it.key}
            iconName={it.key}
            label={it.label}
            on={it.active}
            onClick={it.onClick}
            dataUiScope={`${dataUiScope}.item-${it.key}`}
          />
        ))}
        <div className="flex-1" />
        {footItems.map((it) => (
          <IconButton
            key={it.key}
            iconName={it.key}
            label={it.label}
            onClick={it.onClick}
            dataUiScope={`${dataUiScope}.foot-${it.key}`}
          />
        ))}
      </div>
    </div>
  )
}
