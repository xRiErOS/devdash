import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import Badge from '../atoms/Badge.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Stack from '../layout/Stack.jsx'
import SegmentedControl from '../molecules/SegmentedControl.jsx'
import WidgetBase from './WidgetBase.jsx'
import UserStoryForm from './UserStoryForm.jsx'
import UserStoryInfoOverlay from '../molecules/UserStoryInfoOverlay.jsx'

/**
 * UserStoriesWidget — GF-329/GF-T4.5 Organism (05.30 Widgets). Prüfinstanz eines
 * Issues (Konkretisierung §4.7, D06): DoD-artige Liste der UserStories, je Story
 * Titel + Details + QA-Kriterien + Verdikt-Badge {open,accepted,rejected} +
 * Fortschritt n/total akzeptiert. Terminal/DoD-Rework (PO-#4.5): transparenter Card-
 * Hintergrund, Verdikt-Badge im Terminal-Tint, ghost Plus-Create-IconButton oben-rechts
 * statt Inline-Add-Form, Filter-SegmentedControl (Aktuell=nur offen / Alle).
 *
 * Affordanzen (präsentational, controlled — wie DefinitionOfDoneWidget):
 *  - Refinement: Create/Edit über UserStoryForm-Modal (Öffnen = lokaler UI-State),
 *    Persistenz via onAdd/onEdit/onRemove (Callback gesetzt → Affordanz sichtbar).
 *  - Review (`reviewMode`): Verdikt-Toggle accept/reject über `onVerdict` (PO-exklusiv,
 *    DD-186) — Aggregation/Persistenz beim Consumer (Backend BE2).
 *
 * data-ui: Wurzel `user-stories`; Create-Trigger `user-stories.create`; Filter
 * `user-stories.filter`; Progress `user-stories.progress`; je Story `user-stories.item-${key}`
 * mit `.title/.details/.qa/.verdict` + Affordanz-Anker `.edit/.remove/.accept/.reject`.
 *
 * @param {object} props
 * @param {string} [props.title='User Stories']
 * @param {import('react').ReactNode} [props.heading] - optionale self-titled Heading-Zeile
 *   (GF-2 WidgetBase): gesetzt → WidgetBase rendert oben ein <WidgetHeading/> (Dot +
 *   --heading-accent, kein `// `-Slash) mit {Filter-SegmentedControl + Create-Plus} rechts
 *   als hover-reveal `action`. Fehlt der Prop → kein self-title (back-compat für
 *   Slot-getriebene Kompositionen SprintDetails/MilestoneDetails/MemoryDetails, die den
 *   Titel selbst im Slot stellen und dieses Widget headless einbetten).
 * @param {boolean} [props.showTitle=true] - Legacy-Titel-Zeile (h3) anzeigen (false =
 *   headless für Slot-Einbettung; der einbettende Slot stellt den Titel als Block-Label).
 *   Ignoriert, wenn `heading` gesetzt ist (dann übernimmt WidgetBase die Kopfzeile).
 * @param {Array<{key:string,title:string,details?:string,qa?:string,verdict?:'open'|'accepted'|'rejected'}>} [props.stories]
 * @param {boolean} [props.reviewMode=false] - Review-Kontext (Verdikt-Toggle sichtbar).
 * @param {(key:string, verdict:'accepted'|'rejected')=>void} [props.onVerdict]
 * @param {(key:string, patch:{title:string,verdict:'open'|'accepted'|'rejected'})=>void} [props.onEdit] - gesetzt → Edit-Affordanz je Story.
 * @param {(key:string)=>void} [props.onRemove] - gesetzt → Remove-Affordanz je Story.
 * @param {(payload:{title:string})=>void} [props.onAdd] - gesetzt → Create-Affordanz sichtbar.
 * @param {'open'|'all'} [props.filterDefault='open'] - Start-Filter (Aktuell=open | Alle=all).
 * @param {boolean} [props.disabled=false]
 * @param {import('react').ReactNode} [props.emptyHint='Noch keine User Stories.']
 * @param {'crust'|'mantle'|'base'|'surface0'|'transparent'} [props.tone='transparent'] - back-compat,
 *   nicht mehr wirksam (WidgetBase besitzt die Fill-Quelle --layer-3, D-QC1).
 * @param {boolean} [props.bordered=false] - back-compat, nicht mehr wirksam (WidgetBase
 *   besitzt Border/Fill/Radius).
 * @param {string} [props.className]
 */

// Verdikt-Schlüssel → Label + Badge-Tone (Terminal-Tint). StatusBadge kennt {open,accepted}
// nicht (issue-/sprint-/milestone-Enum), daher eigene UserStory-Verdikt-Taxonomie.
const VERDICT = {
  open: { label: 'Offen', tone: 'neutral' },
  accepted: { label: 'Akzeptiert', tone: 'green' },
  rejected: { label: 'Abgelehnt', tone: 'red' },
}

const FILTER_OPTIONS = [
  { value: 'open', label: 'Aktuell' },
  { value: 'all', label: 'Alle' },
]

export default function UserStoriesWidget({
  title = 'User Stories',
  heading,
  showTitle = true,
  stories = [],
  reviewMode = false,
  // 'review-readonly' (GF-2 T4): US-Rows als Pruefgrundlage im Review-Screen — keine
  // per-US-Verdict/Edit/Remove-Affordanzen (Verdict ist issue-level, D01), stattdessen
  // je Row ein UserStoryInfoOverlay (Akzeptanzkriterien). Verdict ist issue-level (D01).
  displayMode,
  onVerdict,
  onEdit,
  onRemove,
  onAdd,
  filterDefault = 'open',
  // #14: Filter-SegmentedControl-Size. Default 'sm' (Desktop); Mobile-Container (ReviewFlowMobile)
  // setzt 'touch' (44px, Apple HIG) für fingertaugliche Trefferfläche.
  filterSize = 'sm',
  disabled = false,
  emptyHint = 'Noch keine User Stories.',
  // back-compat: WidgetBase besitzt Fill/Border/Radius — diese Props sind nicht mehr wirksam.
  tone: _tone = 'transparent',
  bordered: _bordered = false,
  className = '',
  // eslint-disable-next-line no-unused-vars
  ...rest
}) {
  const reviewReadonly = displayMode === 'review-readonly'
  const [filter, setFilter] = useState(filterDefault)
  // form: { variant:'create' } | { variant:'edit', story } | null
  const [form, setForm] = useState(null)

  const acceptedCount = stories.filter((s) => s.verdict === 'accepted').length
  // Aktuell = nur offene Stories; Alle = alle.
  const visible = filter === 'open' ? stories.filter((s) => (s.verdict || 'open') === 'open') : stories

  const openCreate = () => setForm({ variant: 'create' })
  const openEdit = (s) => setForm({ variant: 'edit', story: s })
  const closeForm = () => setForm(null)

  const handleCreate = (payload) => onAdd?.(payload)
  const handlePatch = (patch) => {
    if (form?.story) onEdit?.(form.story.key, patch)
  }

  // Filter-SegmentedControl + Create-Plus — in beiden Modi identisch. Headless: rechts in
  // der Top-Row; mit `heading`: als hover-reveal `action`-Slot der WidgetBase-Heading.
  const controls = (
    <div className="flex items-center gap-2">
      <div data-ui="user-stories.filter">
        <SegmentedControl
          ariaLabel="User-Stories-Filter"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          size={filterSize}
        />
      </div>
      {onAdd && (
        <IconButton
          icon={<Plus size={16} aria-hidden="true" />}
          label="User Story erfassen"
          onClick={openCreate}
          disabled={disabled}
          size="sm"
          variant="ghost"
          data-ui="user-stories.create"
        />
      )}
    </div>
  )

  return (
    <WidgetBase heading={heading} action={controls} dataUi="user-stories" className={className}>
      <Stack gap="sm">
        {/* GF-2 WidgetBase: ist `heading` gesetzt, stellt WidgetBase die self-titled
            Heading-Zeile (Dot + heading-accent) inkl. {Filter + Create} als hover-reveal
            action. Ohne `heading` bleibt die headless Top-Row (Slot stellt den Titel via
            showTitle/CommentLabel). */}
        {heading == null && (
          <div className="flex items-center justify-between gap-2">
            {showTitle ? (
              <h3 data-ui="user-stories.title" className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text)]">{title}</h3>
            ) : (
              <span />
            )}
            {controls}
          </div>
        )}

        {visible.length === 0 ? (
          <p data-ui="user-stories.empty-hint" className="text-xs text-[var(--subtext0)]">
            {emptyHint}
          </p>
        ) : (
          <div>
            {visible.map((s, i) => {
              const v = VERDICT[s.verdict] || VERDICT.open
              const scope = `user-stories.item-${s.key}`
              return (
                <div
                  key={s.key}
                  data-ui={scope}
                  className={`flex items-start gap-2 py-2 ${i === 0 ? '' : 'border-t border-[var(--border)]'}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span data-ui={`${scope}.title`} className="text-sm font-medium text-[var(--text)]">{s.title}</span>
                      <Badge data-ui={`${scope}.verdict`} tone={v.tone} appearance="tint" size="sm">{v.label}</Badge>
                    </div>
                    {s.details && (
                      <p data-ui={`${scope}.details`} className="mt-1 whitespace-pre-wrap text-sm text-[var(--subtext0)]">{s.details}</p>
                    )}
                    {s.qa && (
                      <div data-ui={`${scope}.qa`} className="mt-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--overlay0)]">QA-Kriterien</span>
                        <p className="whitespace-pre-wrap text-xs text-[var(--subtext0)]">{s.qa}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(reviewReadonly || reviewMode) && (
                      <UserStoryInfoOverlay storyKey={s.key} title={s.title} details={s.details} qa={s.qa} />
                    )}
                    {!reviewReadonly && reviewMode && onVerdict && (
                      <>
                        <IconButton
                          icon={<Check size={16} aria-hidden="true" />}
                          label="Akzeptieren"
                          onClick={() => onVerdict(s.key, 'accepted')}
                          disabled={disabled}
                          size="sm"
                          variant={s.verdict === 'accepted' ? 'primary' : 'ghost'}
                          data-ui={`${scope}.accept`}
                        />
                        <IconButton
                          icon={<X size={16} aria-hidden="true" />}
                          label="Ablehnen"
                          onClick={() => onVerdict(s.key, 'rejected')}
                          disabled={disabled}
                          size="sm"
                          variant={s.verdict === 'rejected' ? 'danger' : 'ghost'}
                          data-ui={`${scope}.reject`}
                        />
                      </>
                    )}
                    {!reviewReadonly && onEdit && (
                      <IconButton
                        icon={<Pencil size={15} aria-hidden="true" />}
                        label="Bearbeiten"
                        onClick={() => openEdit(s)}
                        disabled={disabled}
                        size="sm"
                        variant="ghost"
                        reveal
                        data-ui={`${scope}.edit`}
                      />
                    )}
                    {!reviewReadonly && onRemove && (
                      <IconButton
                        icon={<Trash2 size={15} aria-hidden="true" />}
                        label="Entfernen"
                        onClick={() => onRemove(s.key)}
                        disabled={disabled}
                        size="sm"
                        variant="ghost"
                        reveal
                        className="[&_svg]:text-[var(--red)]"
                        data-ui={`${scope}.remove`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div data-ui="user-stories.metrics" className="flex items-center justify-end text-[11px] text-[var(--subtext0)]">
          <span data-ui="user-stories.progress" className="tabular-nums">
            {acceptedCount}/{stories.length} akzeptiert
          </span>
        </div>
      </Stack>

      {(onAdd || onEdit) && (
        <UserStoryForm
          open={form != null}
          onClose={closeForm}
          variant={form?.variant || 'create'}
          story={form?.story}
          onCreate={handleCreate}
          onPatch={handlePatch}
        />
      )}
    </WidgetBase>
  )
}
