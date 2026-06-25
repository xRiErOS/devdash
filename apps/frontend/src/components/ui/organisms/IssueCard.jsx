/**
 * IssueCard — kanonisches, token-sauberes Organism (DD-481 Extract aus
 * src/components/sprintBoard/primitives.jsx → `IssueCard`).
 *
 * Domänen-bewusste Einheit: rendert eine einzelne Issue-Karte (Priority-Border,
 * Type-Icon, Titel mit optionalem Such-Highlight, Issue-Key, Outlier-Status,
 * Tags, Abhängigkeits-Zähler). Komponiert die Atoms StatusBadge, Pill und TypeIcon.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Die
 * gehobene Kopplung gegenüber der Quelle:
 *  - Quelle rief inline `StatusPicker` → `patchIssueStatus(item.id, …)` +
 *    `window.dispatchEvent('devd-backlog-changed')` auf. Diese Mutation ist hier
 *    zur Callback-Prop `onStatusChange(id, next, notes)` gehoben; der Status wird
 *    rein über das `StatusBadge`-Atom angezeigt (kein eingebetteter API-Picker).
 *  - Quelle nutzte den `highlight()`-Helper, der ein inline-`<mark style>` rendert.
 *    Hier durch ein token-cleanes, lokales `<mark className>` ersetzt (gleiche
 *    Split-Semantik, gleiches Treffer-Verhalten).
 *  - `displayId` (reiner Formatter) bleibt importiert — keine Daten-Kopplung.
 *
 * Ephemerer UI-State: keiner nötig (Klick/Keyboard-Handler sind zustandslos).
 *
 * @param {object} props
 * @param {object} props.item - Issue-Datensatz: { id, title, type, status, priority,
 *                              tags?: [{id,name,color?}], dependencies_count?,
 *                              project_prefix?, project_number? }
 * @param {boolean} [props.isDragging=false] - visuelles Drag-Dimming (vom Sortable-Wrapper)
 * @param {boolean} [props.selected=false] - Einzel-Selektion (Outline-Highlight)
 * @param {boolean} [props.multiSelected=false] - Multi-Selektion (Hintergrund-Tint)
 * @param {string} [props.highlightQuery=''] - Such-Query → Titel-Treffer-Highlight
 * @param {(id:number)=>void} [props.onSelect] - Klick/Enter → Issue öffnen
 * @param {(id:number)=>void} [props.onToggleMulti] - Cmd/Ctrl+Klick → Multi-Toggle
 * @param {(id:number, next:string, notes?:string)=>void} [props.onStatusChange] - Outlier-Status-Mutation (gehoben)
 * @param {string} [props.dataUiScope='issue-card'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import StatusBadge from '../atoms/StatusBadge.jsx'
import Pill from '../atoms/Pill.jsx'
import { TypeIcon } from '../atoms/typeIcons.jsx'
import { displayId } from '../../../lib/displayId.js'

// DD-48: Status-Pill nur bei Outliern. refined/planned/done werden durch Spalte impliziert.
export const OUTLIER_STATUSES = new Set(['in_progress', 'to_review', 'blocked', 'cancelled'])

// Priority → statische Border-Token-Klasse (JIT-sichtbar, kein String-Interpolation).
const PRIORITY_BORDER = {
  1: 'border-l-[var(--priority-1)]',
  2: 'border-l-[var(--priority-2)]',
  3: 'border-l-[var(--priority-3)]',
  4: 'border-l-[var(--priority-4)]',
  5: 'border-l-[var(--priority-5)]',
}

// Regex-Sonderzeichen escapen, damit die Such-Query nicht als Pattern interpretiert wird.
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Token-cleanes Highlight: zerlegt Text an Query-Treffern und wrappt Treffer in
// ein <mark> mit Tailwind-Klassen (Ersatz für den inline-style-Helper der Quelle).
function renderHighlighted(text, query, scope) {
  const safe = String(text ?? '')
  const q = String(query ?? '').trim()
  if (!safe || !q) return safe
  try {
    const re = new RegExp(`(${escapeRegex(q)})`, 'gi')
    return safe.split(re).map((part, i) =>
      i % 2 === 1 ? (
        <mark
          key={i}
          data-ui={`${scope}.title.match`}
          className="rounded-sm px-0.5 bg-[color-mix(in_srgb,var(--accent-warning)_32%,transparent)] text-[var(--text)]"
        >
          {part}
        </mark>
      ) : (
        part
      )
    )
  } catch {
    return safe
  }
}

export default function IssueCard({
  item,
  isDragging = false,
  selected = false,
  multiSelected = false,
  highlightQuery = '',
  onSelect,
  onToggleMulti,
  onStatusChange,
  dataUiScope = 'issue-card',
  className = '',
}) {
  const tags = item.tags || []
  const showStatusPill = OUTLIER_STATUSES.has(item.status)
  const depCount = item.dependencies_count || 0
  const hasMeta = showStatusPill || tags.length > 0 || depCount > 0

  const handleClick = (e) => {
    e.preventDefault()
    if (e.metaKey || e.ctrlKey) {
      onToggleMulti?.(item.id)
      return
    }
    onSelect?.(item.id)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(item.id)
    }
  }

  // multiSelected → Info-Tint, sonst Surface-Grund (token-clean statt inline-style).
  const bgClass = multiSelected
    ? 'bg-[color-mix(in_srgb,var(--accent-info)_18%,transparent)]'
    : 'bg-[var(--surface0)]'
  // selected → Info-Outline (Ring statt outline-style, gleicher visueller Effekt).
  const selectedClass = selected ? 'ring-2 ring-[var(--accent-info)] ring-inset' : ''
  const dragClass = isDragging ? 'opacity-50' : 'hover:shadow-md'
  const borderClass = PRIORITY_BORDER[item.priority] || 'border-l-[var(--priority-5)]'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-ui={dataUiScope}
      className={`block py-2 pr-3 pl-2.5 mb-2 rounded-lg border-l-4 transition-shadow cursor-pointer ${borderClass} ${bgClass} ${selectedClass} ${dragClass} ${className}`}
      title={`P${item.priority} · ${item.type} (Cmd/Ctrl+Klick = mehrfach selektieren)`}
    >
      <div className="flex items-center gap-2 mb-1">
        <TypeIcon type={item.type} />
        <p data-ui={`${dataUiScope}.title`} className="text-sm font-medium leading-snug line-clamp-2 flex-1 min-w-0">
          {renderHighlighted(item.title, highlightQuery, dataUiScope)}
        </p>
        <span data-ui={`${dataUiScope}.key`} className="text-[10px] font-mono shrink-0 text-[var(--subtext0)]">
          {displayId(item)}
        </span>
      </div>
      {hasMeta && (
        <div data-ui={`${dataUiScope}.meta`} className="flex items-center gap-1.5 flex-wrap pl-6">
          {showStatusPill && (
            <StatusBadge
              status={item.status}
              data-ui={`${dataUiScope}.status`}
              onClick={onStatusChange ? () => onStatusChange(item.id, item.status) : undefined}
            />
          )}
          {tags.map((t) => (
            <Pill key={t.id} variant="outline" color="info" size="sm" data-ui={`${dataUiScope}.tags.item`}>
              {t.name}
            </Pill>
          ))}
          {depCount > 0 && (
            <Pill
              variant="outline"
              color="primary"
              size="sm"
              data-ui={`${dataUiScope}.deps`}
              title={`${depCount} Abhängigkeit(en)`}
            >
              dep:{depCount}
            </Pill>
          )}
        </div>
      )}
    </div>
  )
}
