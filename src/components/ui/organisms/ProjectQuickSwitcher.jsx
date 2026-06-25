/**
 * ProjectQuickSwitcher — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/ProjectQuickSwitcher.jsx, DD-194/DD-368/DD-451).
 *
 * Domänen-bewusste Einheit: Projekt-Picker mit Fuzzy-Search (Name/Slug/Prefix) +
 * Keyboard-Navigation (Arrow/Enter/Esc) über eine gefilterte Projekt-Liste plus
 * zwei gepinnte Aktions-Einträge ("Projekt-Übersicht", "Neues Projekt anlegen").
 * Komponiert die Atoms Input (Such-Feld) und PopoverPanel (Floating-Listen-Optik).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/Navigation/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle lud die Liste via `fetch('/api/projects')` + filterte `archived`. Jetzt
 *    kommt sie als reine Prop `projects` (Konsument liefert die bereits gefilterte
 *    Liste). Die Default-`open`-Reset-Effekte (query/activeIdx leeren) bleiben als
 *    ephemerer UI-Lifecycle, das Daten-Laden selbst entfällt.
 *  - Quelle rief `setActiveProjectId`/`setActiveSlug` (projectStore) + `navigate(...)`
 *    (react-router) für Projektwechsel und Pfad-Erhalt. Diese Mutationen sind hier
 *    zu Callback-Props gehoben: `onSelect(projectId)`, `onOpenOverview()`,
 *    `onCreateNew()`. Der Konsument kennt Routing/Store und führt die Navigation aus.
 *  - Quelle las `getActiveProjectId()` für die "aktiv"-Markierung → jetzt Prop
 *    `currentProjectId`.
 *  - Quelle rahmte sich selbst in ein `<Modal>` + eingebettetes `ProjectCreateModal`.
 *    Das Organism ist hier modal-frei (reines Picker-Panel); Modal-Wrapper und das
 *    Create-Modal sind Sache des Konsumenten (`onCreateNew`-Callback).
 *  - Die DB-Farbe (`p.color`) wird wie in der Quelle via ref-Callback auf eine CSS-
 *    Custom-Property (`--badge-bg`) gesetzt — kein inline-style (DD-451).
 *
 * Ephemerer UI-State (bleibt lokal): `query` (Such-Eingabe), `activeIdx`
 * (Keyboard-Cursor), Input-Auto-Focus + open-Reset (useEffect), Keyboard-Handler.
 *
 * @param {object} props
 * @param {boolean} [props.open=true] - sichtbar; steuert Auto-Focus + Reset
 * @param {Array<{id:number,name:string,slug?:string,prefix?:string,color?:string}>} [props.projects=[]]
 *        - bereits gefilterte (nicht-archivierte) Projekt-Liste
 * @param {number} [props.currentProjectId] - aktuell aktives Projekt → "aktiv"-Badge
 * @param {(projectId:number)=>void} [props.onSelect] - Projekt gewählt (gehoben: Store+Navigation)
 * @param {()=>void} [props.onOpenOverview] - "Projekt-Übersicht" gewählt (gehoben: navigate('/projects'))
 * @param {()=>void} [props.onCreateNew] - "Neues Projekt anlegen" gewählt (gehoben: Create-Modal)
 * @param {()=>void} [props.onClose] - Esc → schließen
 * @param {string} [props.dataUiScope='project-quick-switcher'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, LayoutDashboard, Search } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import PopoverPanel from '../atoms/PopoverPanel.jsx'

function badgeLabel(p) {
  return p.prefix || (p.slug || '').slice(0, 2).toUpperCase()
}

// Projekt-Badge mit dynamischer DB-Farbe (p.color) via ref-Callback auf eine CSS-
// Custom-Property — kein inline-style (DD-451 Enforcement).
function ProjectBadge({ color, label, dataUi }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.style.setProperty('--badge-bg', color || 'var(--surface1)')
  }, [color])
  return (
    <span
      ref={ref}
      data-ui={dataUi}
      className="w-6 h-6 rounded flex items-center justify-center font-mono text-[10px] shrink-0 bg-[var(--badge-bg)] text-[var(--on-accent)]"
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

export default function ProjectQuickSwitcher({
  open = true,
  projects = [],
  currentProjectId,
  onSelect,
  onOpenOverview,
  onCreateNew,
  onClose,
  dataUiScope = 'project-quick-switcher',
  className = '',
}) {
  // Ephemerer UI-State: Such-Eingabe + Keyboard-Cursor.
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)

  // open → Reset (query/activeIdx leeren) + Auto-Focus. Kein Daten-Laden mehr.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIdx(0)
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q) ||
      (p.prefix || '').toLowerCase().includes(q)
    )
  }, [projects, query])

  // DD-194: pinned "Projekt-Übersicht" VOR "+ Neues Projekt anlegen".
  // Indizes: filtered[0..n-1], dann overviewIdx = n, createIdx = n+1.
  const overviewIdx = filtered.length
  const createIdx = filtered.length + 1
  const totalEntries = filtered.length + 2

  useEffect(() => {
    if (activeIdx > createIdx) setActiveIdx(createIdx)
  }, [filtered, activeIdx, createIdx])

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(totalEntries - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx === createIdx) {
        onCreateNew?.()
        return
      }
      if (activeIdx === overviewIdx) {
        onOpenOverview?.()
        return
      }
      const target = filtered[activeIdx]
      if (target) onSelect?.(target.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose?.()
    }
  }

  return (
    <PopoverPanel
      data-ui={dataUiScope}
      className={`static z-auto mt-0 w-full overflow-hidden ${className}`}
    >
      <Input
        leadingIcon={<Search size={16} />}
        data-ui={`${dataUiScope}.filter.query`}
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIdx(0)
        }}
        onKeyDown={handleKey}
        placeholder="Projekt suchen…"
        aria-label="Projekt-Quick-Switcher"
        className="rounded-none border-b border-[var(--surface0)] py-3"
      />
      <ul data-ui={`${dataUiScope}.list`} role="listbox" className="max-h-72 overflow-y-auto">
        {filtered.length === 0 && (
          <li
            data-ui={`${dataUiScope}.list.empty`}
            className="px-4 py-3 text-sm text-[var(--subtext0)]"
          >
            Keine Projekte gefunden.
          </li>
        )}
        {filtered.map((p, idx) => {
          const isActive = idx === activeIdx
          const isCurrent = p.id === currentProjectId
          return (
            <li
              data-ui={`${dataUiScope}.item.${p.id}`}
              key={p.id}
              role="option"
              aria-selected={isActive}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => onSelect?.(p.id)}
              className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 text-[var(--text)] border-l-[3px] ${isActive ? 'bg-[var(--surface0)]' : 'bg-transparent'} ${isCurrent ? 'border-l-[var(--accent-info)]' : 'border-l-transparent'}`}
            >
              <ProjectBadge color={p.color} label={badgeLabel(p)} dataUi={`${dataUiScope}.item.badge`} />
              <span className="flex-1 min-w-0 truncate font-display">{p.name}</span>
              {isCurrent && (
                <span
                  data-ui={`${dataUiScope}.item.active-tag`}
                  className="text-[10px] font-mono uppercase text-[var(--accent-info)]"
                >
                  aktiv
                </span>
              )}
            </li>
          )
        })}
        {/* DD-194: pinned Übersicht-Eintrag direkt vor "+ Neues Projekt". */}
        <li
          data-ui={`${dataUiScope}.overview`}
          role="option"
          aria-selected={activeIdx === overviewIdx}
          onMouseEnter={() => setActiveIdx(overviewIdx)}
          onClick={() => onOpenOverview?.()}
          className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 text-[var(--text)] border-t border-[var(--surface0)] ${activeIdx === overviewIdx ? 'bg-[var(--surface0)]' : 'bg-transparent'}`}
        >
          <span
            className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[var(--surface1)] text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            <LayoutDashboard size={14} />
          </span>
          <span className="flex-1 min-w-0 truncate font-display">Projekt-Übersicht</span>
        </li>
        <li
          data-ui={`${dataUiScope}.create`}
          role="option"
          aria-selected={activeIdx === createIdx}
          onMouseEnter={() => setActiveIdx(createIdx)}
          onClick={() => onCreateNew?.()}
          className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 text-[var(--accent-primary)] border-t border-[var(--surface0)] ${activeIdx === createIdx ? 'bg-[var(--surface0)]' : 'bg-transparent'}`}
        >
          <span
            className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[var(--surface1)] text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            <Plus size={14} />
          </span>
          <span className="flex-1 min-w-0 truncate font-display">Neues Projekt anlegen</span>
        </li>
      </ul>
      <div
        data-ui={`${dataUiScope}.footer`}
        className="px-4 py-2 text-[11px] font-mono flex justify-between bg-[var(--surface0)] text-[var(--subtext0)] border-t border-[var(--surface0)]"
      >
        <span>↑↓ navigieren · Enter wechseln</span>
        <span>Esc schließen</span>
      </div>
    </PopoverPanel>
  )
}
