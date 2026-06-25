import WidgetBase from './WidgetBase.jsx'
import Input from '../atoms/Input.jsx'
import Link from '../atoms/Link.jsx'
import EntityPill from '../atoms/EntityPill.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import { renderMarkdown } from '../../../lib/markdown.js'

const noop = () => {}
const DETAIL_MAX = 500 // D-D: Details ≤500 Zeichen (Anriss)

/**
 * SessionNotesWidget — präsentationale, durchsuchbare Notiz-Liste (GF-2 S2 T4, D-D).
 * Zentrale Recherche-Fläche: Such-Input + Liste auswählbarer Notizen. Je Note:
 * ID · Titel · Detail-Anriss (≤500, Markdown read-only) · PR-Link · Sprint-Chips ·
 * Issue-Chips. Reuse der MemoryBrowse-Listen-Muster (EntityPill-Chips).
 *
 * PRESENTATIONAL: kein Store/Fetch — Filtern macht der Consumer via onSearch.
 * Live = Backend-Track T-be1 (eigene Tabelle session_notes + FTS), NICHT hier.
 *
 * @param {object} props
 * @param {Array<{id:string,title:string,detailMd?:string,pr?:string,sprints?:string[],issues?:string[]}>} [props.notes=[]]
 * @param {string} [props.query=''] - aktueller Suchbegriff (controlled)
 * @param {(q:string)=>void} [props.onSearch] - Suchbegriff-Änderung (gehoben)
 * @param {(id:string)=>void} [props.onSelect] - Note-Auswahl (Master-Detail)
 * @param {string|null} [props.selectedId] - aktuell gewählte Note
 * @param {string} [props.heading='Session Notes']
 * @param {string} [props.dataUi='session-notes']
 */
export default function SessionNotesWidget({
  notes = [],
  query = '',
  onSearch = noop,
  onSelect = noop,
  selectedId = null,
  heading = 'Session Notes',
  dataUi = 'session-notes',
}) {
  return (
    <WidgetBase heading={heading} dataUi={dataUi}>
      <div className="flex flex-col gap-3">
        <div data-ui={`${dataUi}.search`}>
          <Input
            type="search"
            surface="surface0"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Notizen durchsuchen …"
            aria-label="Session Notes durchsuchen"
            leadingIcon={<Icon name="search" size={14} mono />}
          />
        </div>

        {notes.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Icon name="search" size={20} mono />}
            title="Keine Notizen gefunden."
            description="Suchbegriff anpassen oder neue Notiz anlegen."
          />
        ) : (
          <ul data-ui={`${dataUi}.list`} role="list" className="flex flex-col gap-1">
            {notes.map((n) => {
              const itemUi = `${dataUi}.item-${n.id}`
              const selected = selectedId === n.id
              const sprints = Array.isArray(n.sprints) ? n.sprints : []
              const issues = Array.isArray(n.issues) ? n.issues : []
              const detail = (n.detailMd || '').slice(0, DETAIL_MAX)
              return (
                <li
                  key={n.id}
                  data-ui={itemUi}
                  aria-current={selected ? 'true' : undefined}
                  className={`flex flex-col gap-1.5 rounded-lg border p-2.5 ${selected ? 'border-[var(--accent-primary)] bg-[var(--layer-4)]' : 'border-[var(--surface2)] bg-[var(--layer-4)]'}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(n.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(n.id) } }}
                      data-ui={`${itemUi}.title`}
                      className="flex-1 min-w-0 cursor-pointer text-start text-sm font-medium text-[var(--text)] break-words"
                    >
                      {n.title}
                    </div>
                    <span
                      data-ui={`${itemUi}.id`}
                      title={n.id}
                      className="shrink-0 rounded-sm bg-[var(--surface0)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--subtext0)]"
                    >
                      {n.id}
                    </span>
                  </div>

                  {detail && (
                    <div
                      data-ui={`${itemUi}.detail`}
                      className="text-[var(--subtext1)] [&_p]:!text-[var(--subtext1)] line-clamp-3 overflow-hidden"
                      // renderMarkdown = reiner read-only Formatter (lib/markdown.js); Detail bereits auf ≤500 geclippt.
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(detail) }}
                    />
                  )}

                  {(n.pr || sprints.length > 0 || issues.length > 0) && (
                    <div data-ui={`${itemUi}.meta`} className="flex flex-wrap items-center gap-1.5">
                      {n.pr && (
                        <Link href={n.pr} external variant="muted" data-ui={`${itemUi}.pr`} className="text-[11px] font-mono">
                          PR
                        </Link>
                      )}
                      {sprints.map((s) => (
                        <EntityPill key={s} id={s} entity="sprint" size="sm" showName={false} />
                      ))}
                      {issues.map((iss) => (
                        <EntityPill key={iss} id={iss} entity="issue" size="sm" showName={false} />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </WidgetBase>
  )
}
