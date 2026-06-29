/**
 * BulkActionBar — fixierte Massen-Aktionsleiste (Spec §6). Erscheint, sobald
 * ≥ 1 Element selektiert ist; Slide-out (`translateY(100%)`) wenn die Selektion
 * leer wird. v1: vier Aktionen (Status/Priorität/Sprint setzen + Löschen), links
 * Auswahlzähler + „Alle aufheben".
 *
 * Jede Aktion öffnet ein Popover-Menü mit den konkreten Optionen (Status-Werte,
 * P1–P4, Sprints); Löschen öffnet einen Bestätigungs-Dialog. Tastatur-Kette
 * (Feedback): Tab erreicht die Leiste → Enter/Space öffnet das Menü → Pfeil
 * roving in den Optionen → Enter/Space wählt → `onAction(action, value)`. `Esc`
 * schließt das offene Menü.
 *
 * Welches Menü offen ist, hält die Bar selbst (uncontrolled). Stories setzen den
 * Startzustand über `openAction`, um die Menüs als Snapshot zu zeigen.
 *
 * Integrations-Hinweis: `priority` hat (noch) KEINEN Backend-Bulk-Endpunkt
 * (`elementsApi.bulkUpdateIssues` kennt nur status/sprint/delete) — das Menü ist
 * sichtbar, trägt aber den Hinweis; `set_priority` muss serverseitig nach (I01).
 *
 * @param {object} props
 * @param {number} [props.count=0] - Anzahl selektierter Elemente
 * @param {boolean} [props.visible] - sichtbar (Default: count > 0)
 * @param {{statuses?:Array,priorities?:Array,sprints?:Array}} [props.options] - Menü-Optionen
 * @param {'status'|'priority'|'sprint'|'delete'|null} [props.openAction=null] - initial offenes Menü (Stories)
 * @param {()=>void} [props.onClear] - „Alle aufheben"
 * @param {(action:string, value?:any)=>void} [props.onAction] - gewählte Aktion + Wert
 * @param {string} [props.dataUiScope='organism.bulkActionBar']
 * @param {string} [props.className]
 */
import { useEffect, useRef, useState } from 'react'
import Icon from '../../foundations/Icon.jsx'

const DEFAULT_OPTIONS = {
  statuses: [
    { key: 'new', label: 'Neu' },
    { key: 'refined', label: 'Verfeinert' },
    { key: 'planned', label: 'Geplant' },
    { key: 'in_progress', label: 'In Arbeit' },
    { key: 'to_review', label: 'Review' },
    { key: 'completed', label: 'Abgeschlossen' },
  ],
  priorities: [
    { key: 1, label: 'P1 — kritisch' },
    { key: 2, label: 'P2 — hoch' },
    { key: 3, label: 'P3 — mittel' },
    { key: 4, label: 'P4 — niedrig' },
  ],
  sprints: [
    { key: 'dd49', label: 'DD2#49 Browser-Organismus' },
    { key: 'dd50', label: 'DD2#50 Promote' },
    { key: '__backlog', label: 'Aus Sprint nehmen (Backlog)' },
  ],
}

const ACTIONS = [
  { key: 'status', label: 'Status', iconName: 'status-open', optKey: 'statuses' },
  { key: 'priority', label: 'Priorität', iconName: 'flag', optKey: 'priorities' },
  { key: 'sprint', label: 'Sprint', iconName: 'layers', optKey: 'sprints' },
]

const MENU = 'absolute bottom-full right-0 mb-2 z-40 flex flex-col bg-[var(--mantle)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-pop)]'

function ActionButton({ iconName, label, danger, expanded, haspopup = 'menu', onClick, scope }) {
  const tone = danger ? 'text-[var(--accent-danger)]' : 'text-[var(--subtext1)]'
  return (
    <button
      type="button"
      data-ui={scope}
      aria-haspopup={haspopup}
      aria-expanded={expanded}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-[5px] border border-[var(--border)] [font-family:var(--font-display)] text-xs font-semibold ${tone} ${expanded ? 'bg-[var(--state-active)]' : 'hover:bg-[var(--state-hover)]'}`}
    >
      <Icon name={iconName} size={14} mono />
      {label}
      <Icon name={danger ? 'chevron-up' : 'chevron-down'} size={13} mono />
    </button>
  )
}

// Optionen-Popover: roving per Pfeil, Esc schließt, Enter/Space wählt (native).
function ActionMenu({ items, note, label, onPick, onClose, scope }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.querySelector('[role="menuitem"]')?.focus()
  }, [])
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const btns = Array.from(ref.current?.querySelectorAll('[role="menuitem"]') || [])
      if (btns.length === 0) return
      const i = btns.indexOf(document.activeElement)
      const d = e.key === 'ArrowDown' ? 1 : -1
      btns[(i + d + btns.length) % btns.length].focus()
    }
  }
  return (
    <div ref={ref} data-ui={scope} role="menu" aria-label={label} onKeyDown={onKeyDown} className={`${MENU} min-w-[200px] p-1`}>
      {note && (
        <div data-ui={`${scope}.note`} className="px-2 py-1.5 text-[10px] leading-snug text-[var(--accent-warning)]">{note}</div>
      )}
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="menuitem"
          data-ui={`${scope}.item-${it.key}`}
          onClick={() => onPick(it.key)}
          className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] text-[var(--text)] outline-none hover:bg-[var(--state-hover)] focus:bg-[var(--state-hover)]"
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

// Lösch-Bestätigung (Soft-Delete → cancelled). Esc/Abbrechen = Abbruch.
function DeleteConfirm({ count, onConfirm, onClose, scope }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose?.() } }
  return (
    <div data-ui={scope} role="alertdialog" aria-label="Löschen bestätigen" onKeyDown={onKeyDown} className={`${MENU} w-[268px] gap-[var(--space-2)] p-[var(--space-3)]`}>
      <div data-ui={`${scope}.text`} className="text-[12px] leading-snug text-[var(--text)]">
        <strong>{count}</strong> Element(e) löschen? Soft-Delete → Status <strong>cancelled</strong> (wiederherstellbar).
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" data-ui={`${scope}.cancel`} onClick={onClose} className="rounded-md border border-[var(--border)] px-3 py-[5px] [font-family:var(--font-display)] text-xs font-semibold text-[var(--subtext1)] hover:bg-[var(--state-hover)]">
          Abbrechen
        </button>
        <button ref={ref} type="button" data-ui={`${scope}.confirm`} onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-md border border-transparent bg-[var(--accent-danger)] px-3 py-[5px] [font-family:var(--font-display)] text-xs font-semibold text-[var(--base)]">
          <Icon name="delete" size={14} inherit />Löschen
        </button>
      </div>
    </div>
  )
}

export default function BulkActionBar({
  count = 0, visible, options, openAction = null,
  onClear, onAction,
  dataUiScope = 'organism.bulkActionBar', className = '',
}) {
  const opts = { ...DEFAULT_OPTIONS, ...(options || {}) }
  const [open, setOpen] = useState(openAction)
  const shown = visible == null ? count > 0 : visible

  const toggle = (key) => setOpen((o) => (o === key ? null : key))
  const close = () => setOpen(null)
  const pick = (action, value) => { onAction?.(action, value); close() }

  return (
    <div
      data-ui={dataUiScope}
      role="toolbar"
      aria-label="Massen-Aktionen"
      aria-hidden={!shown}
      className={`fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-between px-[var(--space-4)] bg-[var(--mantle)] border-t border-[var(--border)] shadow-[var(--shadow-pop)] transition-transform ${shown ? 'translate-y-0' : 'translate-y-full'} ${className}`}
    >
      <div data-ui={`${dataUiScope}.count`} className="flex items-center gap-[var(--space-3)]">
        <span className="[font-family:var(--font-display)] text-[13px] font-bold text-[var(--text)]">{count} ausgewählt</span>
        <button type="button" data-ui={`${dataUiScope}.clear`} onClick={onClear} className="text-[12px] text-[var(--subtext0)] underline hover:text-[var(--text)]">
          Alle aufheben
        </button>
      </div>

      <div data-ui={`${dataUiScope}.actions`} className="flex items-center gap-[var(--space-2)]">
        {ACTIONS.map((a) => (
          <div key={a.key} className="relative">
            <ActionButton
              iconName={a.iconName}
              label={a.label}
              expanded={open === a.key}
              onClick={() => toggle(a.key)}
              scope={`${dataUiScope}.action-${a.key}`}
            />
            {open === a.key && (
              <ActionMenu
                items={opts[a.optKey]}
                label={a.label}
                note={a.key === 'priority' ? 'Hinweis: set_priority fehlt serverseitig (I01)' : null}
                onPick={(value) => pick(a.key, value)}
                onClose={close}
                scope={`${dataUiScope}.menu-${a.key}`}
              />
            )}
          </div>
        ))}

        <div className="relative">
          <ActionButton
            iconName="delete"
            label="Löschen"
            danger
            haspopup="dialog"
            expanded={open === 'delete'}
            onClick={() => toggle('delete')}
            scope={`${dataUiScope}.action-delete`}
          />
          {open === 'delete' && (
            <DeleteConfirm
              count={count}
              onConfirm={() => pick('delete')}
              onClose={close}
              scope={`${dataUiScope}.confirm-delete`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
