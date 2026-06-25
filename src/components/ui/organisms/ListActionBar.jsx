import { ListChecks } from 'lucide-react'
import SearchField from '../molecules/SearchField.jsx'
import TriggerButton from '../molecules/TriggerButton.jsx'

/**
 * GF-246 — ListActionBar (Organism, 05.20 Actions, OR-07). Der Kopf der ListView:
 * ein SearchField + eine action-as-data-Trigger-Leiste (Filter/Sort/Transfer).
 *
 * Ebene-6 (OR-07): CAP-trash-soft-delete-status 🟡 partial (cancelled-Status-Toggle).
 * Rein präsentational: die Trigger tragen nur `onTrigger`-Callbacks; der Filter-/
 * Sort-State lebt im FilterDialog/SortDialog/ListView, nicht hier. `active`/`count`
 * je Action spiegeln den angewandten Stand (Props).
 *
 * action-as-data (D10-F): `actions`-Array `{id,label,icon,active,count,onTrigger}` —
 * dieselbe Daten-Struktur speist später die Mobile-FAB-Präsentation (D09 deferred).
 *
 * @param {object} props
 * @param {string} [props.searchValue=''] - controlled Suchbegriff.
 * @param {(e:any)=>void} [props.onSearchChange]
 * @param {()=>void} [props.onSearchClear]
 * @param {string} [props.searchPlaceholder='Suchen…']
 * @param {Array<{id:string,label:string,icon?:import('react').ReactNode,active?:boolean,count?:number,iconOnly?:boolean,disabled?:boolean,onTrigger?:()=>void}>} [props.actions=[]]
 * @param {boolean} [props.selectMode=false] - Select-Mode aktiv (R3-LAB-1): Toggle hervorgehoben.
 * @param {()=>void} [props.onToggleSelectMode] - Gesetzt → Mode-Toggle rendert. Klick öffnet
 *   beim Consumer den SelectAllModal (GF-292) — die „Alle auswählen"-Steuerung lebt dort,
 *   nicht mehr inline in der Leiste.
 * @param {string} [props['data-ui']='organism.list-action-bar'] - Anker-Scope (für Nesting in ListView überschreibbar).
 * @param {string} [props.className]
 */
export default function ListActionBar({
  searchValue = '',
  onSearchChange,
  onSearchClear,
  searchPlaceholder = 'Suchen…',
  actions = [],
  selectMode = false,
  onToggleSelectMode,
  'data-ui': dataUi = 'organism.list-action-bar',
  className = '',
}) {
  return (
    <div data-ui={dataUi} className={`flex items-center gap-2 ${className}`}>
      <div data-ui={`${dataUi}.search`} className="min-w-0 flex-1">
        <SearchField
          value={searchValue}
          onChange={onSearchChange}
          onClear={onSearchClear}
          placeholder={searchPlaceholder}
          surface="bordered"
        />
      </div>
      <div className="flex items-center gap-1">
        {onToggleSelectMode ? (
          <TriggerButton
            data-ui={`${dataUi}.select-toggle`}
            icon={<ListChecks size={14} aria-hidden="true" />}
            pressed={selectMode}
            onClick={onToggleSelectMode}
            label="Auswählen"
          >
            Auswählen
          </TriggerButton>
        ) : null}
        {actions.map((a) => (
          <TriggerButton
            key={a.id}
            data-ui={`${dataUi}.trigger-${a.id}`}
            icon={a.icon}
            active={a.active}
            count={a.count}
            iconOnly={a.iconOnly}
            reserveCount
            disabled={a.disabled}
            onClick={a.onTrigger}
            label={a.label}
          >
            {a.label}
          </TriggerButton>
        ))}
      </div>
    </div>
  )
}
