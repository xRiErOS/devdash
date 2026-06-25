import { X } from 'lucide-react'
import Modal from './Modal.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * ShortcutsHelp — Molecule (harvested aus components/ShortcutsHelp.jsx, DD#61).
 * Modal-Cheat-Sheet: zeigt gruppierte Tastenkürzel als statische Tabelle.
 * Props-driven (Sections via `shortcuts`), kein Store/Fetch, keine Domänen-Logik.
 * Komponiert Modal + IconButton (Atoms) statt diese inline neu zu bauen.
 *
 * @param {object} props
 * @param {boolean} props.open - Modal sichtbar
 * @param {() => void} props.onClose - Close-Handler (Backdrop/ESC/Close-Button)
 * @param {Array<{title:string, items:Array<{keys:string[], desc:string}>}>} [props.shortcuts=DEFAULT_SHORTCUTS]
 *   - Gruppierte Shortcut-Sektionen. Jede Section: Titel + Items (keys[] + desc).
 * @param {string} [props.title='Tastenkuerzel'] - Modal-Header
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Modal-Breite
 */
const DEFAULT_SHORTCUTS = [
  {
    title: 'Navigation',
    items: [
      { keys: ['h'], desc: 'Sprint Board (Home)' },
      { keys: ['b'], desc: 'Backlog' },
      { keys: ['m'], desc: 'Milestones' },
      { keys: ['d'], desc: 'Abhaengigkeiten' },
      { keys: ['p'], desc: 'Projekt-Einstellungen' },
      { keys: ['r'], desc: 'Review-Page des review-Sprints öffnen (Fallback: active)' },
      { keys: ['Cmd/Ctrl+←'], desc: 'Zurück (Browser-History)' },
      { keys: ['Cmd/Ctrl+→'], desc: 'Vorwärts (Browser-History)' },
    ],
  },
  {
    title: 'Aktionen',
    items: [
      { keys: ['c'], desc: 'Neues Issue anlegen' },
      { keys: ['/', 'f'], desc: 'Suche fokussieren' },
      { keys: ['q'], desc: 'Projekt-Quick-Switcher' },
      { keys: ['?'], desc: 'Diese Hilfe ein-/ausblenden' },
      { keys: ['Cmd/Ctrl+Z'], desc: 'Backlog: letztes D&D rückgängig' },
      { keys: ['Cmd/Ctrl+Shift+Z'], desc: 'Backlog: rückgängig wiederholen' },
    ],
  },
  {
    title: 'Formulare',
    items: [
      { keys: ['Tab'], desc: 'Naechstes Feld' },
      { keys: ['Shift+Tab'], desc: 'Vorheriges Feld' },
      { keys: ['Cmd/Ctrl+S'], desc: 'Speichern' },
      { keys: ['Cmd/Ctrl+Enter'], desc: 'Speichern (alternativ)' },
      { keys: ['Esc'], desc: 'Modal / Sidebar schliessen' },
    ],
  },
  {
    title: 'Issue Side-Panel (DD-131)',
    items: [
      { keys: ['E'], desc: 'Beschreibung-Section in Edit-Modus' },
      { keys: ['1'], desc: 'Tab Details' },
      { keys: ['2'], desc: 'Tab Sub-Tasks & Deps' },
      { keys: ['3'], desc: 'Tab Reviews' },
      { keys: ['4'], desc: 'Tab Aktivität' },
      { keys: ['Cmd/Ctrl+S'], desc: 'Aktive Section speichern' },
      { keys: ['Cmd/Ctrl+Enter'], desc: 'Aktive Section speichern (alternativ)' },
      { keys: ['Esc'], desc: 'Side-Panel schliessen (oder Feld blur)' },
    ],
  },
  {
    title: 'Sonstiges',
    items: [
      { keys: ['Cmd/Ctrl + Klick'], desc: 'Issue mehrfach selektieren (Bulk)' },
    ],
  },
]

export default function ShortcutsHelp({
  open,
  onClose,
  shortcuts = DEFAULT_SHORTCUTS,
  title = 'Tastenkuerzel',
  size = 'md',
}) {
  const closeBtn = (
    <IconButton
      icon={<X size={16} />}
      label="Schliessen"
      onClick={onClose}
      size="sm"
      variant="ghost"
    />
  )
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      headerActions={closeBtn}
      size={size}
      fade
      padded={false}
      dialogDataUi="shortcuts-help"
    >
      <div className="p-4 overflow-y-auto max-h-[calc(80vh-56px)]" data-ui="shortcuts-help.body">
        {shortcuts.map((sec) => (
          <section key={sec.title} className="mb-4 last:mb-0" data-ui={`shortcuts-help.section.${sec.title}`}>
            <h3 className="text-[11px] font-mono uppercase tracking-wider mb-2 text-[var(--subtext1)]" data-ui="shortcuts-help.title">
              {sec.title}
            </h3>
            <ul data-ui="shortcuts-help.list">
              {sec.items.map((s, i) => (
                <li
                  key={s.desc}
                  className={`flex items-center justify-between py-1.5${i < sec.items.length - 1 ? ' border-b border-[var(--surface1)]' : ''}`}
                  data-ui={`shortcuts-help.item.${i}`}
                >
                  <span className="text-sm text-[var(--text)]" data-ui="shortcuts-help.label">{s.desc}</span>
                  <span className="flex gap-1" data-ui="shortcuts-help.value">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface1)] text-[var(--text)] border border-[var(--surface2)]"
                        data-ui={`shortcuts-help.badge.${k}`}
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
