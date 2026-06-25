import EntityPill from '../atoms/EntityPill.jsx'

/**
 * MasterDetailEntryTitle — Molecule (04.40 Data Display, GF-2 T03 DD-Review).
 *
 * Zentraler Titel-Kopf eines im Detail-Pane geöffneten Master-Detail-Eintrags:
 * EntityPill (ID, optional klickbar) + Klartext-Titel (truncate) links, ein frei
 * einsetzbarer Aktions-Slot rechts. Slot-Design für tool-weite Wiederverwendung
 * (BacklogPage · künftige Master-Detail-Screens) statt je Screen inline ein
 * eigenes h2/Pill-Cluster nachzubauen.
 *
 * PRESENTATIONAL: props-driven, kein Store/Fetch, keine Domänen-Logik (Strings +
 * Slots kommen rein). Token-clean (0 inline-style, 0 Roh-Hex). Komponiert das
 * EntityPill-Atom; der Aktions-Slot trägt der Aufrufer bei (z.B. „voll öffnen").
 *
 * @param {object} props
 * @param {string} [props.id] - Entity-Key (z.B. "DD-137"); ohne id wird die Pille weggelassen.
 * @param {'sprint'|'issue'|'milestone'|'dod'|'todo'|'neutral'} [props.entity='neutral'] - EntityPill-Appearance.
 * @param {import('react').ReactNode} props.title - Klartext-Titel (truncate).
 * @param {(e:any)=>void} [props.onIdClick] - Klick auf die EntityPill (z.B. Detail voll öffnen).
 * @param {import('react').ReactNode} [props.actions] - rechter Aktions-Slot (Buttons o.ä.).
 * @param {string} [props.dataUiScope='master-detail-entry-title'] - data-ui-Wurzel; Sub-Anker (.lead/.id/.title/.actions) gepunktet abgeleitet.
 * @param {string} [props.className]
 */
export default function MasterDetailEntryTitle({
  id,
  entity = 'neutral',
  title,
  onIdClick,
  actions,
  dataUiScope = 'master-detail-entry-title',
  className = '',
}) {
  return (
    <div data-ui={dataUiScope} className={`flex items-center justify-between gap-3 ${className}`}>
      <div data-ui={`${dataUiScope}.lead`} className="flex items-center gap-2 min-w-0">
        {id != null && (
          <EntityPill
            data-ui={`${dataUiScope}.id`}
            id={id}
            entity={entity}
            showName={false}
            onClick={onIdClick}
          />
        )}
        <h2 data-ui={`${dataUiScope}.title`} className="m-0 font-display text-base font-bold text-[var(--text)] truncate">
          {title}
        </h2>
      </div>
      {actions != null && (
        <div data-ui={`${dataUiScope}.actions`} className="shrink-0 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
