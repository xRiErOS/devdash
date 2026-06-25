/**
 * CurrentMilestoneCard — Organism (DD-481 Phase 5 Gap G2, Projekt-Home Overview).
 *
 * Domänen-bewusste Einheit: zeigt die Meilenstein-Sequenz Vorgänger → Aktiv →
 * Nachfolger eines Projekts. Der aktive Meilenstein ist akzentuiert, Vorgänger/
 * Nachfolger gedimmt (gestrichelte Border). Header trägt eine Add-Action zum
 * Anlegen eines neuen Meilensteins. Komponiert die Atoms Card + IconButton + die
 * Layout-Primitives Cluster + Stack.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API/useEffect-Datenladen. Die
 * drei Meilensteine kommen als Props; die Add-Mutation ist zur Callback-Prop
 * `onAdd` gehoben (der Konsument legt an). Kein eigener State.
 *
 * TOKEN-CLEAN: 0 inline-style-Literale, 0 Raw-Hex. Akzent-Tint via
 * `color-mix(... var(--accent-primary) ...)` (gleiches Muster wie ProjectHomeTabs).
 *
 * @param {object} props
 * @param {object|string|null} [props.predecessor=null] - Vorgänger ({name} oder String)
 * @param {object|string|null} [props.active=null] - aktiver Meilenstein ({name} oder String)
 * @param {object|string|null} [props.successor=null] - Nachfolger ({name} oder String)
 * @param {()=>void} [props.onAdd] - Add-Action „Neuen Meilenstein anlegen"
 * @param {()=>void} [props.onSelectPredecessor] - Klick auf Vorgänger-Tile → Meilenstein-Seite
 * @param {()=>void} [props.onSelectActive] - Klick auf den AKTIVEN Tile → Meilenstein-Seite
 *        öffnen (gesetzt → aktiver Tile wird Button/Keyboard-Trigger)
 * @param {()=>void} [props.onSelectSuccessor] - Klick auf Nachfolger-Tile → Meilenstein-Seite
 * @param {string} [props.title='Current Milestone'] - Card-Titel
 * @param {string} [props.dataUiScope='current-milestone-card'] - Wurzel-data-ui-bereich (I03/D01)
 * @param {string} [props.className] - zusätzliche Klassen
 */
import { Plus } from 'lucide-react'
import Card from '../atoms/Card.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Cluster from '../layout/Cluster.jsx'
import Stack from '../layout/Stack.jsx'

const ROLE_LABEL = {
  predecessor: 'Vorgänger',
  active: 'Aktiver Meilenstein',
  successor: 'Nachfolger',
}

function milestoneName(m) {
  return typeof m === 'string' ? m : m?.name || ''
}

function MilestoneTile({ role, milestone, onSelect, dataUiScope }) {
  const isActive = role === 'active'
  const name = milestoneName(milestone)
  const toneCls = isActive
    ? 'border-solid border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]'
    : 'border-dashed border-[var(--surface2)] text-[var(--overlay0)] bg-[var(--base)]'
  const fallback = isActive ? 'Kein aktiver Meilenstein' : '—'
  const clickable = typeof onSelect === 'function'
  const handleKey = (e) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onSelect : undefined}
      onKeyDown={clickable ? handleKey : undefined}
      data-ui={`${dataUiScope}.${role}`}
      className={`flex flex-col justify-center min-h-11 rounded-lg border px-3 py-2.5 ${toneCls} ${clickable ? 'cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)]' : ''}`}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-80">{ROLE_LABEL[role]}</span>
      <span className="text-sm font-medium truncate" title={name || undefined}>
        {name || fallback}
      </span>
    </div>
  )
}

export default function CurrentMilestoneCard({
  predecessor = null,
  active = null,
  successor = null,
  onAdd,
  onSelectPredecessor,
  onSelectActive,
  onSelectSuccessor,
  title = 'Current Milestone',
  dataUiScope = 'current-milestone-card',
  className = '',
}) {
  return (
    <Card tone="mantle" data-ui={dataUiScope} className={className}>
      <Cluster justify="between" className="mb-3 flex-nowrap">
        <h3 data-ui={`${dataUiScope}.title`} className="m-0 text-[13px] font-bold text-[var(--text)]">
          {title}
        </h3>
        <IconButton
          size="sm"
          icon={<Plus size={16} aria-hidden="true" />}
          label="Neuen Meilenstein anlegen"
          variant="default"
          onClick={onAdd}
          data-ui={`${dataUiScope}.add`}
        />
      </Cluster>

      <Stack gap="sm" data-ui={`${dataUiScope}.sequence`}>
        <MilestoneTile role="predecessor" milestone={predecessor} onSelect={onSelectPredecessor} dataUiScope={dataUiScope} />
        <MilestoneTile role="active" milestone={active} onSelect={onSelectActive} dataUiScope={dataUiScope} />
        <MilestoneTile role="successor" milestone={successor} onSelect={onSelectSuccessor} dataUiScope={dataUiScope} />
      </Stack>
    </Card>
  )
}
