/**
 * DependencyForm — generisches, token-sauberes Organism für Abhängigkeits-
 * Erfassung (DD-481). Abstrahiert den verworfenen MilestoneDependencyEditor
 * (DD-367-Harvest) auf drei gleichtypige Varianten: `milestone`, `sprint`,
 * `issue`. Eine Abhängigkeit ist immer GLEICHTYPIG (Milestone↔Milestone,
 * Sprint↔Sprint, Issue↔Issue) — die Variante bestimmt nur Begriffe/Anker.
 *
 * Layout nach PO-Wireframe (DependencyForm_WireFrame.png): zwei vertikal
 * gestapelte Sektionen (Vorgänger oben, Nachfolger unten), je eine Liste der
 * bestehenden Verknüpfungen als volle-Breite-Cards (entfernbar) plus ein
 * Select-Picker als Ghost-Add-Card. Das Picker-Drop-Down zeigt „intelligent"
 * nur Kandidaten ohne bestehende/konkurrierende Verknüpfung (availableCandidates).
 *
 * PRESENTATIONAL: kein fetch/Store/API/useEffect-Datenladen. Mutationen als
 * Callback-Props:
 *   onAdd(predecessorId, successorId) — Anlegen einer Abhängigkeit
 *   onRemove(dependencyId)           — Entfernen einer Abhängigkeit
 * Der Konsument führt die API-Calls aus, behandelt 409/Zyklus-Fehler und liefert
 * eine optionale `error`-Meldung zurück.
 *
 * @param {object} props
 * @param {{id:number}} props.entity - das Subjekt, dessen Deps editiert werden
 * @param {'milestone'|'sprint'|'issue'} [props.variant='milestone'] - Typ-Preset
 * @param {Array<{id:number, name:string}>} [props.candidates=[]] - mögliche
 *        Verknüpfungs-Ziele; intern via availableCandidates gefiltert
 * @param {{predecessors?:Array, successors?:Array}} [props.deps={}] -
 *        bestehende Abhängigkeiten. Items: { id, name, dependency_id }
 * @param {(predecessorId:number, successorId:number)=>void} [props.onAdd]
 * @param {(dependencyId:number)=>void} [props.onRemove]
 * @param {{kind?:string, msg:string}|null} [props.error=null] - Fehler-/Zyklus-Meldung
 * @param {string} [props.title='Abhängigkeiten'] - Header-Titel (nur bei Eigen-Chrome)
 * @param {()=>void} [props.onClose] - wenn gesetzt: Form rendert EIGENE Chrome
 *        (Header-X + Footer-„Fertig", beide rufen onClose). Mapping wirkt sofort
 *        (kein Rollback) — onClose schließt nur. Eingebettet (Modal liefert
 *        Chrome) NICHT setzen, sonst doppelte Chrome.
 * @param {string} [props.dataUiScope='dependency-form'] - Wurzel-data-ui-bereich
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { X } from 'lucide-react'
import Select from '../molecules/Select.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Button from '../atoms/Button.jsx'

// Typ-Presets — unterscheiden sich NUR in Begriffen/Default-Anker, nicht in Logik.
const VARIANTS = {
  milestone: { noun: 'Milestone', nounPlural: 'Milestones' },
  sprint: { noun: 'Sprint', nounPlural: 'Sprints' },
  issue: { noun: 'Issue', nounPlural: 'Issues' },
}

// PURE: Kandidaten, die als Dependency-Ziel in Frage kommen — alle außer dem
// eigenen Subjekt und außer bereits verknüpften (excludeIds). Robust gegen
// leere/null-Eingaben.
export function availableCandidates(allEntities, entityId, excludeIds) {
  if (!Array.isArray(allEntities)) return []
  const exclude = excludeIds instanceof Set ? excludeIds : new Set(excludeIds ?? [])
  return allEntities.filter((e) => e && e.id !== entityId && !exclude.has(e.id))
}

// Tone der Fehler-/Erfolgs-Meldung → statische Token-Klassen-Map (JIT-sichtbar).
const ERROR_TONE = {
  error: 'bg-[var(--accent-danger)] text-[var(--on-accent)]',
  success: 'bg-[var(--accent-success)] text-[var(--on-accent)]',
}

const ROLE_LABEL = { predecessor: 'Vorgänger', successor: 'Nachfolger' }

export default function DependencyForm({
  entity,
  variant = 'milestone',
  candidates = [],
  deps = {},
  onAdd,
  onRemove,
  error = null,
  title = 'Abhängigkeiten',
  onClose,
  dataUiScope = 'dependency-form',
  className = '',
}) {
  const preset = VARIANTS[variant] ?? VARIANTS.milestone

  const predecessors = deps?.predecessors ?? []
  const successors = deps?.successors ?? []
  const predecessorIds = new Set(predecessors.map((d) => d.id))
  const successorIds = new Set(successors.map((d) => d.id))
  const preCandidates = availableCandidates(candidates, entity?.id, predecessorIds)
  const sucCandidates = availableCandidates(candidates, entity?.id, successorIds)

  const toOptions = (list) => list.map((c) => ({ value: String(c.id), label: c.name }))
  const toneClass = error ? (ERROR_TONE[error.kind] || ERROR_TONE.error) : ''

  // Pick → sofort anlegen (Wireframe: Drop-Down wählen genügt, kein Confirm-Button).
  const addPre = (v) => { if (v && entity) onAdd?.(Number(v), entity.id) }
  const addSuc = (v) => { if (v && entity) onAdd?.(entity.id, Number(v)) }

  // Eine Dependency-Card (volle Breite): Name + Entfernen.
  const renderItem = (d, role) => (
    <li
      key={d.dependency_id}
      data-testid={`${role}-${d.name}`}
      data-ui={`${dataUiScope}.${role}.item.${d.dependency_id}`}
      className="flex items-center justify-between gap-2 px-3 min-h-11 rounded-lg border border-[var(--surface1)] bg-[var(--base)]"
    >
      <span className="min-w-0 truncate text-sm font-medium text-[var(--text)]">{d.name}</span>
      <IconButton
        icon={<X size={16} />}
        label={`${ROLE_LABEL[role]} ${d.name} entfernen`}
        variant="ghost"
        size="sm"
        onClick={() => onRemove?.(d.dependency_id)}
        className="opacity-60 hover:opacity-100"
        data-testid={`${role}-remove-${d.name}`}
        data-ui={`${dataUiScope}.${role}.remove`}
      />
    </li>
  )

  const renderSection = (role, items, cands, onPick) => {
    const label = ROLE_LABEL[role]
    return (
      <section data-testid={`${role}s-section`} data-ui={`${dataUiScope}.${role}s`}>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--subtext0)]">{label}</h4>
        {items.length === 0 ? (
          <p data-ui={`${dataUiScope}.${role}s.empty`} className="m-0 mb-2 text-[13px] italic text-[var(--subtext0)]">
            Noch keine {label}
          </p>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-col gap-2 mb-2">
            {items.map((d) => renderItem(d, role))}
          </ul>
        )}
        <div data-ui={`${dataUiScope}.${role}.select`}>
          <Select
            value=""
            options={toOptions(cands)}
            onChange={onPick}
            size="lg"
            placeholder={`+ ${preset.noun} als ${label} hinzufügen…`}
            ariaLabel={`${label} (${preset.noun}) hinzufügen`}
          />
        </div>
      </section>
    )
  }

  return (
    <div
      data-testid={`dependency-form-${entity?.id}`}
      data-ui={dataUiScope}
      className={`flex flex-col ${className}`}
    >
      {onClose && (
        <header className="flex items-center justify-between gap-2 mb-3">
          <h3 className="m-0 text-sm font-semibold text-[var(--text)]">{title}</h3>
          <IconButton
            icon={<X size={16} />}
            label="Schließen"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="opacity-60 hover:opacity-100"
            data-ui={`${dataUiScope}.close`}
          />
        </header>
      )}

      <div className="flex flex-col gap-4">
        {error && (
          <div
            data-testid="dependency-toast"
            data-ui={`${dataUiScope}.toast`}
            role="alert"
            className={`px-3 py-2 rounded-lg text-sm ${toneClass}`}
          >
            {error.msg}
          </div>
        )}

        {renderSection('predecessor', predecessors, preCandidates, addPre)}
        {renderSection('successor', successors, sucCandidates, addSuc)}
      </div>

      {onClose && (
        <footer className="flex justify-end mt-4 pt-3 border-t border-[var(--surface0)]">
          <Button variant="primary" size="md" onClick={onClose} data-ui={`${dataUiScope}.done`}>
            Fertig
          </Button>
        </footer>
      )}
    </div>
  )
}
