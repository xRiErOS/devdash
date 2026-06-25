/**
 * IssueRow — Organism (DD-481 Phase-3 Harvest aus src/components/IssueRow.jsx).
 *
 * Domäne: ISSUE. Kompakte Backlog-Zeile, die ein Issue-Item domänen-bewusst
 * komponiert: Drag-Handle, Issue-Key (displayId), Type-Icon, Titel (mit
 * Suchwort-Highlight), Tag-Pills, Status-Badge, optionaler Sprint-Pill und ein
 * frei einsetzbarer Refine-Slot. Bewusst KEIN Cluster-Primitive: die Zeile
 * darf nicht umbrechen — alle Pflichtfelder bleiben einzeilig sichtbar (DD-137).
 *
 * PRESENTATIONAL (D-Phase3-01):
 * - Gehobene Kopplung: KEINE. Die Quelle war bereits props-driven (item +
 *   Callbacks). Der frühere Inline-`StatusPicker`-Import wird durch das
 *   token-saubere `StatusBadge`-Atom (read-only Anzeige) ersetzt; der
 *   Statuswechsel läuft über den `onStatusChange`-Callback nach oben.
 * - `displayId`/`highlight` sind reine pure-Helper (kein Fetch/Store) und
 *   bleiben als Util-Import erhalten.
 * - Ephemerer UI-State: KEINER nötig — die Zeile ist rein darstellend; alle
 *   Interaktion (open/multi/status) wird via Callback delegiert.
 *
 * I03: Der data-ui-Wurzel-bereich ist parametrisiert (`dataUiScope`, Default
 * 'issue-row'). Der Screen kann ihn in Phase 5 auf 'backlog' umbiegen, ohne die
 * Library-Datei zu ändern (D01 Dual-Namespace).
 *
 * @param {object} props
 * @param {object} props.item - Issue-Datensatz (id, title, type, status, priority, tags[], project_prefix, project_number).
 * @param {string} [props.search=''] - Suchquery für Titel-Highlight.
 * @param {boolean} [props.isLast=false] - letzte Zeile (keine untere Border).
 * @param {boolean} [props.multiSelected=false] - hervorgehobener Multi-Select-Zustand.
 * @param {boolean} [props.active=false] - DD-Review: die aktuell im Detail-Pane
 *   geöffnete Zeile (distinkt von multiSelected). Primary-getönter Hintergrund +
 *   aria-current, damit in langen Listen sichtbar bleibt, welches Item rechts steht.
 * @param {object} [props.dragHandleProps={}] - vom DnD-Wrapper durchgereichte Handle-Props.
 * @param {{id:(string|number), name?:string, key?:string}|null} [props.sprint=null] - zugewiesener Sprint (optionaler SprintPill).
 * @param {(id:(string|number)) => void} [props.onOpen] - Klick auf Zeile (öffnen).
 * @param {(id:(string|number)) => void} [props.onToggleMulti] - Cmd/Ctrl+Klick (Multi-Select-Toggle).
 * @param {(next:string, notes?:string) => void} [props.onStatusChange] - Statuswechsel-Callback.
 * @param {import('react').ReactNode} [props.refineSlot=null] - frei einsetzbarer Slot (Row-Action-Erweiterung).
 * @param {string} [props.dataUiScope='issue-row'] - parametrisierter data-ui-Wurzel-bereich (I03).
 * @param {boolean} [props.wrapOnMobile=false] - DD-607: opt-in. <md darf die Zeile
 *   umbrechen und der Titel mehrzeilig brechen (statt truncate), ab md gilt weiter
 *   die einzeilige DD-137-Regel. Default false → alle Bestands-Surfaces unverändert.
 * @param {'transparent'|'base'|'layer-1'|'layer-2'|'layer-3'|'layer-4'} [props.restTone='transparent'] -
 *   B02-Review: Ruhe-Fill der Zeile (nur Nicht-selektiert/-aktiv), Layer-Alias-Klasse.
 *   Default transparent = Bestands-Verhalten; Selection-/Active-Tönung unberührt.
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Element.
 */

import { GripVertical } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import Pill from '../atoms/Pill.jsx'
import EntityPill from '../atoms/EntityPill.jsx'
import { TypeIcon } from '../atoms/typeIcons.jsx'
import { displayId } from '../../../lib/displayId.js'
import { highlight } from '../../../lib/highlight.js'

// Priorität (1..5) → Border-Left-Klasse. Statisch, damit der Tailwind-JIT die
// Token-Klassen literal sieht (kein `var(--priority-${n})`-Interpolations-Style).
// Spiegelt --priority-1..5 aus src/index.css (red/peach/blue/teal/overlay0).
const PRIORITY_BORDER = {
  1: 'border-l-[var(--priority-1)]',
  2: 'border-l-[var(--priority-2)]',
  3: 'border-l-[var(--priority-3)]',
  4: 'border-l-[var(--priority-4)]',
  5: 'border-l-[var(--priority-5)]',
}
const FALLBACK_BORDER = 'border-l-[var(--surface2)]'

// PO-Review B02: Ruhe-Fill der Zeile (nur der NICHT-selektierte/-aktive Zustand).
// Theme-aware Layer-Aliase (R14), Default transparent = unverändert. Erlaubt dem
// PO, im Storybook zu prüfen, ob die Liste von einem eigenen Row-Fill profitiert,
// ohne die Accent-Tönung der Selection-/Active-Zustände zu verlieren.
const REST_TONE = {
  transparent: 'bg-transparent',
  base: 'bg-[var(--layer-bg)]',
  'layer-1': 'bg-[var(--layer-1)]',
  'layer-2': 'bg-[var(--layer-2)]',
  'layer-3': 'bg-[var(--layer-3)]',
  'layer-4': 'bg-[var(--layer-4)]',
}

// Catppuccin-Tag-Farbe → Pill-Palette (outline-Variante). Statisch → JIT-sichtbar.
const TAG_COLOR_TO_PALETTE = {
  blue: 'info',
  green: 'success',
  peach: 'warning',
  mauve: 'primary',
  teal: 'info',
  overlay0: 'neutral',
  red: 'danger',
}

export default function IssueRow({
  item,
  search = '',
  isLast = false,
  multiSelected = false,
  active = false,
  dragHandleProps = {},
  sprint = null,
  onOpen,
  onToggleMulti,
  onStatusChange,
  refineSlot = null,
  dataUiScope = 'issue-row',
  wrapOnMobile = false,
  restTone = 'transparent',
  className = '',
}) {
  const tags = item.tags || []
  const borderClass = PRIORITY_BORDER[item.priority] || FALLBACK_BORDER
  const rowState = multiSelected
    ? 'bg-[color-mix(in_srgb,var(--accent-info)_18%,transparent)]'
    : active
      ? 'bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)]'
      : (REST_TONE[restTone] || REST_TONE.transparent)
  const borderBottom = isLast ? '' : 'border-b border-b-[var(--surface0)]'

  return (
    <div
      data-testid={`backlog-row-${item.id}`}
      data-ui={dataUiScope}
      role="button"
      tabIndex={0}
      aria-current={active ? 'true' : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) { onToggleMulti?.(item.id); return }
        onOpen?.(item.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (e.metaKey || e.ctrlKey) { onToggleMulti?.(item.id); return }
          onOpen?.(item.id)
        }
      }}
      title={`P${item.priority} · ${item.type} (Cmd/Ctrl+Klick = mehrfach)`}
      className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-2 gap-y-1 pr-2 py-1.5 pl-1 border-l-4 cursor-pointer ${borderClass} ${rowState} ${borderBottom} ${className}`}
    >
      {/* col1 row1 (GF-PO 2026-06-24 Skizze): Handle + Issue-ID zusammen in EINER Spalte.
          stopPropagation: Drag-Handle ist eine eigene Zone (Drag), kein Row-Open. */}
      <div data-ui={`${dataUiScope}.handle-id`} onClick={(e) => e.stopPropagation()} className="row-start-1 col-start-1 flex items-center gap-1">
        <IconButton
          data-ui={`${dataUiScope}.drag-handle`}
          icon={<GripVertical size={14} />}
          label="Issue verschieben"
          variant="ghost"
          size="sm"
          title="Issue auf Sprint-Chip ziehen"
          className="shrink-0 cursor-grab touch-none text-[var(--hint)]"
          {...dragHandleProps}
        />
        <span data-ui={`${dataUiScope}.key`} className="text-[10px] font-mono w-[52px] text-[var(--hint)]">
          {displayId(item)}
        </span>
      </div>

      {/* col2 row1: Typ-Icon als eigene Spalte (PO-Skizze). */}
      <span data-ui={`${dataUiScope}.type-icon`} className="row-start-1 col-start-2 inline-flex shrink-0 text-[var(--subtext0)]">
        <TypeIcon type={item.type} size={14} />
      </span>

      {/* col3 row1: Titel FÜHREND, volle 1fr-Breite → lesbar. GF-PO 2026-06-24:
          Auswahl erfolgt jetzt auf der GANZEN Zeile (Root role="button"), nicht
          mehr nur auf dieser Titel-Region. `.open`-Anker bleibt als Titel-Marker. */}
      <div data-ui={`${dataUiScope}.open`} className="row-start-1 col-start-3 min-w-0 text-left">
        <span data-ui={`${dataUiScope}.title`} className={`block text-sm ${wrapOnMobile ? 'break-words md:truncate' : 'truncate'}`}>
          {highlight(item.title, search)}
        </span>
      </div>

      {/* col4 row1: Status oben rechts + optionaler Refine-Slot.
          stopPropagation: Status/Refine ist eigene Zone (Status-Change), kein Row-Open. */}
      <div onClick={(e) => e.stopPropagation()} className="row-start-1 col-start-4 flex items-center justify-end gap-2">
        <StatusBadge
          data-ui={`${dataUiScope}.status`}
          status={item.status}
          className="shrink-0"
          onClick={onStatusChange ? () => onStatusChange(item.status) : undefined}
        />
        {refineSlot}
      </div>

      {/* col3 row2: Tags/Pillen, unter dem Titel ausgerichtet. */}
      {tags.length > 0 && (
        <div data-ui={`${dataUiScope}.tags`} className="row-start-2 col-start-3 flex flex-wrap items-center gap-1">
          {tags.slice(0, 3).map((t) => (
            <Pill
              key={t.id}
              data-ui={`${dataUiScope}.tags.item-${t.id}`}
              variant="outline"
              color={TAG_COLOR_TO_PALETTE[t.color] || 'neutral'}
              size="sm"
              className="rounded-full"
            >
              {t.name}
            </Pill>
          ))}
        </div>
      )}

      {/* row2 col3→col4: Sprint-Pill unten rechts (unter Status, PO-Skizze).
          DD-Review F1+Folge: Pill spannt col3+col4 (col-span-2) rechtsbündig.
          Dadurch trägt sie NICHT mehr zur Breite des col4-`auto`-Tracks bei —
          col4 wird allein vom Status (row1) bestimmt, sodass die 1fr-col3
          (Titel) unabhängig von der Sprint-Präsenz gleich lang bleibt (vorher
          stahl ein langer Sprint-Name bis zu 7rem Titelbreite). Das 1fr in der
          Spanne absorbiert die Pill-Breite; max-w + min-w-0 truncaten intern. */}
      {sprint && (sprint.id || sprint.key || sprint.name) && (
        <div className="row-start-2 col-start-3 col-span-2 flex justify-end min-w-0">
          <EntityPill
            data-ui={`${dataUiScope}.sprint`}
            id={sprint.key || sprint.id}
            name={sprint.name}
            size="sm"
            color="info"
            className="min-w-0 max-w-[12rem]"
          />
        </div>
      )}
    </div>
  )
}
