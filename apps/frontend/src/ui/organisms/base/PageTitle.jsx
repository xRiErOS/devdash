/**
 * PageTitle — Lead-Panel eines Detail-Screens (Issue/Sprint/Milestone).
 * Aufbau: Key + Bezeichner (links) · Status (rechts) / Meta-Zeile darunter.
 *
 * Komposition: Atome `EntityId` (farbcodierter Key) + `StatusDot` (Lifecycle).
 * Domänenfrei, props-driven — die drei Detail-Screens füllen es mit ihren Daten.
 * Material wie die Widgets (mantle + Border + radius), damit es sich sauber in
 * den Content-Stack einfügt (kein Float-Shadow).
 *
 * @param {object} props
 * @param {'issue'|'sprint'|'milestone'} [props.kind]
 * @param {string} [props.icon] - Registry-Icon vor der ID (für Nicht-Entity-Köpfe
 *   wie die Roadmap, die keinen farbcodierten Entity-Key tragen)
 * @param {React.ReactNode} props.id - Key (z.B. 'DD2-7')
 * @param {string} [props.idTone] - expliziter Catppuccin-Ton für die ID (überschreibt
 *   die kind-Hue) — z.B. 'peach' für den Roadmap-Slug
 * @param {React.ReactNode} props.name - Bezeichner
 * @param {string} [props.status] - roher Lifecycle-Status (→ StatusDot); weglassen
 *   für statuslose Köpfe (Roadmap)
 * @param {React.ReactNode} [props.statusLabel] - sichtbarer Status-Text
 * @param {Array<React.ReactNode>} [props.meta=[]] - Meta-Zeile (Typ · Prio · …)
 * @param {string} [props.dataUiScope='organism.pageTitle']
 * @param {string} [props.className]
 */
import EntityId from '../../atoms/EntityId.jsx'
import StatusDot from '../../atoms/StatusDot.jsx'
import Icon from '../../foundations/Icon.jsx'

export default function PageTitle({
  kind, icon, id, idTone, name, status, statusLabel, meta = [],
  dataUiScope = 'organism.pageTitle', className = '',
}) {
  return (
    <div data-ui={dataUiScope} className={`p-4 bg-[var(--mantle)] border border-[var(--border)] rounded-lg ${className}`}>
      {/* Schmaler Detail-Pane (DD2-12): flex-wrap lässt den Status notfalls in die
          nächste Zeile statt den Titel zu quetschen; EntityId bleibt unteilbar
          (whitespace-nowrap), der Name truncatet sauber statt am Hyphen zu brechen. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span data-ui={`${dataUiScope}.ident`} className="flex items-baseline gap-2 min-w-0 flex-1 text-xl">
          {icon && <Icon name={icon} size={20} mono className="self-center shrink-0" />}
          <EntityId kind={kind} tone={idTone} dataUiScope={`${dataUiScope}.id`} className="shrink-0 whitespace-nowrap">{id}</EntityId>
          <h1 data-ui={`${dataUiScope}.name`} className="m-0 min-w-0 [font-family:var(--font-display)] font-bold tracking-[-0.01em] text-[var(--text)] truncate">{name}</h1>
        </span>
        {status && <StatusDot status={status} label={statusLabel} dataUiScope={`${dataUiScope}.status`} className="shrink-0" />}
      </div>
      {meta.length > 0 && (
        <div data-ui={`${dataUiScope}.meta`} className="flex items-center gap-2 mt-1.5 [font-family:var(--font-display)] text-[12px] text-[var(--subtext0)]">
          {meta.map((m, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[var(--overlay0)]">·</span>}
              <span>{m}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
