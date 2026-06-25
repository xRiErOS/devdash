import { useState } from 'react'
import MasterDetailScreen from '../templates/MasterDetailScreen.jsx'
import Input from '../atoms/Input.jsx'
import Button from '../atoms/Button.jsx'
import Badge from '../atoms/Badge.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import ReviewIssueRow from '../organisms/review/ReviewIssueRow.jsx'
import ReviewStep from '../organisms/review/ReviewStep.jsx'
import { allPassed, buildRoundMarkdown } from '../organisms/review/ReviewSummary.jsx'
import ReviewListFilter from '../organisms/review/ReviewListFilter.jsx'
import { sortByVerdict, filterBySearch } from '../organisms/review/reviewListControls.js'

/**
 * ReviewFlow — Feature-Komposition des Review-Screens (GF-2 T9, 06.80 Deps & Review). Master-Detail:
 * links Listen-Container (Volltextsuche + Sort-Richtung + Runden-Filter + ReviewIssueRow-Liste),
 * rechts ReviewStep des selektierten Issues, oben ReviewSummary (Copy-Markdown + Complete-Gate).
 * Root data-ui: review-flow.root. Default-Filter "nur offen/abgelehnt" (R3/D04).
 *
 * Präsentational mit lokalem UI-State (Auswahl/Filter/Suche/Sort); Verdrahtung gegen Backend
 * folgt im Cutover (T13). Verdict-Props werden an den ReviewStep durchgereicht.
 */
// "open"-Filter = alles ausser bereits abgenommen/abgebrochen.
const isOpenForReview = (i) => i.review_status !== 'passed' && i.review_status !== 'cancelled'

export default function ReviewFlow({
  issues = [],
  sprintKey = '',
  sprintTitle,
  sprintGoal,
  round = 1,
  selectedKey: selectedKeyProp,
  onSelect,
  stepProps = {},
  onComplete,
  submitted = false,
}) {
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const [filter, setFilter] = useState('open')
  const [localSelected, setLocalSelected] = useState(null)

  const byStatus = filter === 'open' ? issues.filter(isOpenForReview) : issues
  const visible = sortByVerdict(filterBySearch(byStatus, search), sortDir)

  const selectedKey = selectedKeyProp ?? localSelected
  const selected =
    issues.find((i) => i.key === selectedKey) || visible[0] || issues[0] || null
  const select = (key) => (onSelect ? onSelect(key) : setLocalSelected(key))

  const total = issues.length
  const passedCount = issues.filter((i) => i.review_status === 'passed').length
  const handleCopy = () => {
    const md = buildRoundMarkdown({ sprintKey, round, issues })
    if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(md)
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* #9: Top-Toolbar — Runden-Status-Badge (offen / übermittelt-wartet-auf-Re-Review) +
          "Review abschließen" oben (vorher unten in der Liste), damit der PO den Runden-Zustand
          und das Abschluss-Gate sofort sieht. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">
            Runde {round}
          </span>
          <Badge
            data-ui="review-flow.round-status"
            tone={submitted ? 'green' : 'teal'}
            appearance="tint"
            size="sm"
          >
            {submitted ? 'Übermittelt — wartet auf Re-Review' : 'Runde offen'}
          </Badge>
        </div>
        <Button
          data-ui="review-flow.complete"
          variant="primary"
          size="sm"
          className="w-full"
          disabled={!allPassed(issues)}
          onClick={onComplete}
          title={allPassed(issues) ? undefined : 'Erst möglich, wenn alle Issues abgenommen sind.'}
        >
          Review abschließen
        </Button>
      </div>
      {/* PO-Runde-3: Suche (Ghost) + Filter-Trigger (Ghost-Icon) nebeneinander in einer Zeile. */}
      <div className="flex items-center gap-2">
        <Input
          data-ui="review-flow.search"
          type="search"
          surface="bordered"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Issues durchsuchen (ID/Titel)…"
          aria-label="Issues durchsuchen"
          className="flex-1"
        />
        <ReviewListFilter sortDir={sortDir} onSortDir={setSortDir} filter={filter} onFilter={setFilter} />
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((issue) => (
          <ReviewIssueRow
            key={issue.key}
            issue={issue}
            selected={selected?.key === issue.key}
            onSelect={select}
          />
        ))}
      </div>
    </div>
  )

  const pane = selected ? (
    <ReviewStep issue={selected} {...stepProps} />
  ) : (
    <EmptyState data-ui="review-flow.empty" title="Keine Issues zu reviewen" description="Alle Issues dieser Runde sind abgenommen." />
  )

  // PO-Mockup A/#3/#4: PageTitle (Sprint) IST ein EntityDetailHeader (Kanon-Komponente), size="page"
  // → text-2xl > Issue-Header text-xl (Text-Hierarchie A). Summary (#3) ist darin integriert:
  // Runde + Progress als Pills, Copy als action-Slot. Complete-Button liegt links in der Liste (C).
  const copyAction = (
    <Button data-ui="review-flow.copy" variant="ghost" size="sm" onClick={handleCopy}>
      Als Markdown kopieren
    </Button>
  )
  // Layout = Tier-07-Template MasterDetailScreen (Anker via Props erhalten); ReviewFlow trägt
  // nur die Review-Domäne (Daten/Filter/Slots).
  return (
    <MasterDetailScreen
      rootDataUi="review-flow.root"
      pageTitleDataUi="review-flow.page-title"
      masterDetailScope="review-flow.root"
      sidebarSurface="layer-2"
      header={{
        id: sprintKey,
        title: sprintTitle || `Sprint-Review ${sprintKey}`,
        goal: sprintGoal,
        pills: [
          { k: 'runde', label: 'Runde', value: String(round), tone: 'teal' },
          { k: 'fortschritt', label: 'Abgenommen', value: `${passedCount}/${total}`, tone: 'green' },
        ],
        action: copyAction,
      }}
      sidebar={sidebar}
      detail={pane}
    />
  )
}
