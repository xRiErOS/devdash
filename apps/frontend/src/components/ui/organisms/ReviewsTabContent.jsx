/**
 * ReviewsTabContent — kanonisches, token-sauberes Organism (DD-481 Phase 3 Batch 4,
 * Harvest aus src/components/itemDetail/ReviewsTabContent.jsx).
 *
 * Domänen-bewusste Einheit: rendert den Review-Runden-Tab eines Issues — die Liste
 * der Review-Runden (Verdict passed/rejected/in_progress via StatusBadge, abgeleitete
 * Runden-Nummer, Zeitstempel, Markdown-Notiz, Screenshot-Thumbnails) plus die ältere
 * Feedback-Historie. Eine Runde wird als Card-Komposition (../atoms/Card.jsx) gerendert,
 * das Verdict über das StatusBadge-Atom (../atoms/StatusBadge.jsx).
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen, keine API-Calls.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Die Quelle bekam `reviews`, `item` und den Mutations-Trigger bereits als Props
 *    (`createReview`, `creatingReview`) durchgereicht — es gab schon keinen eigenen
 *    fetch/Store. Hier verlustfrei übernommen, der Mutations-Trigger ist als
 *    Callback-Prop `onReview` (+ Busy-Flag `reviewing`) umbenannt, um der
 *    Library-Callback-Konvention (on…) zu folgen.
 *  - Externe DATEN kommen als Props: `reviews=[]` (Review-Runden) und `item` (für die
 *    Legacy-`item.feedback`-Historie). `renderMarkdown` (reiner Formatter) bleibt
 *    importiert — keine Daten-Kopplung.
 *  - ~10× inline-`style` (Mantle-Fläche, Subtext-/Hint-Farben, Peach-Button,
 *    Runden-Trenner) → Tailwind-v4-arbitrary + kanonische Tokens (0 inline-style).
 *    `--mantle`→Card tone="mantle", `--hint`→`--subtext1`, `--peach`→`--accent-warning`.
 *
 * Ephemerer UI-State: keiner nötig (Button-Trigger ist zustandslos, Busy-Flag kommt
 * als Prop).
 *
 * @param {object} props
 * @param {object} [props.item] - Issue-Datensatz; genutzt wird nur `item.feedback`:
 *                                [{ id, status, created_at, comment?, screenshots?: [{id,file_path}] }]
 * @param {Array<object>} [props.reviews] - Review-Runden, neueste zuerst:
 *                                [{ id, review_status?, created_at?, notes?, screenshots?: [{id,file_path}] }]
 * @param {() => void} [props.onReview] - Trigger „+ Neue Runde" (gehobene Mutation);
 *                                ohne Prop → kein Runden-Button, read-only Historie
 *                                (Sprint-Review D01 2026-06-11: Verdict-Buttons + Server-
 *                                Auto-Rework erzeugen Runden, manueller Button redundant)
 * @param {(round: object) => void} [props.onSelectRound] - optional: macht die Runden-Nummer
 *                                klickbar (Runde aufrufen, REQ-34 Sprint-Review / UserInput I01
 *                                2026-06-07); ohne Prop bleibt die Anzeige read-only.
 * @param {boolean} [props.reviewing=false] - Busy-Flag → Button disabled + „..."-Label
 * @param {import('react').ReactNode} [props.heading] - optionaler Tier-2 Widget-Header
 *                                (GF-2 Wave-4 WidgetBase): WidgetBase rendert das self-titled
 *                                WidgetHeading (Dot + --heading-accent, kein `// `-Slash), mit
 *                                dem „+ Neue Runde"-Button als hover-reveal Action-Slot. Die
 *                                „Review-Runden (N)"-Zählzeile wird dann zur Subtext-Zeile demoted
 *                                (kein Doppel-Header).
 *                                OHNE Prop → unveränderter headless Output (Back-Compat:
 *                                SprintDetails/MilestoneDetails/MemoryDetails liefern den Titel
 *                                über den Slot, dieses Widget bleibt kopflos).
 * @param {string} [props.dataUiScope='reviews-tab-content'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import Card from '../atoms/Card.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import Badge from '../atoms/Badge.jsx'
import Button from '../atoms/Button.jsx'
import WidgetBase from './WidgetBase.jsx'
import { renderMarkdown } from '../../../lib/markdown.js'

// review_status der Runde → StatusBadge-Status-Schlüssel (statische Map, kein
// Branch-Ausdruck im JSX). 'passed' bleibt, 'not_passed' → 'rejected', sonst läuft.
const VERDICT_STATUS = {
  passed: 'passed',
  not_passed: 'rejected',
}

function verdictStatus(reviewStatus) {
  return VERDICT_STATUS[reviewStatus] || 'in_progress'
}

// GF-332 (D02/§4.14): UserStory-Verdikt → Label + Badge-Tone. StatusBadge kennt
// {open,accepted} nicht → eigene Taxonomie (parität zu UserStoriesWidget).
const US_VERDICT = {
  open: { label: 'Offen', tone: 'neutral' },
  accepted: { label: 'Akzeptiert', tone: 'green' },
  rejected: { label: 'Abgelehnt', tone: 'red' },
}

export default function ReviewsTabContent({
  item,
  reviews = [],
  onReview,
  onSelectRound,
  reviewing = false,
  goal,
  background,
  heading,
  dataUiScope = 'reviews-tab-content',
}) {
  const feedback = item?.feedback || []

  // „+ Neue Runde"-Trigger als wiederverwendbarer Action-Knoten (gleich für
  // WidgetHeader-Action wie für die Legacy-Toolbar-Zeile).
  const addRoundButton = onReview ? (
    <Button
      onClick={onReview}
      loading={reviewing}
      disabled={reviewing}
      variant="secondary"
      size="sm"
      data-ui={`${dataUiScope}.add-round`}
    >
      + Neue Runde
    </Button>
  ) : null

  return (
    <>
      <WidgetBase heading={heading} action={addRoundButton} dataUi={dataUiScope}>
        {(goal || background) && (
          <div data-ui={`${dataUiScope}.context`} className="mb-3 rounded-lg p-3 border border-[var(--border)]">
            {goal && (
              <p data-ui={`${dataUiScope}.context.goal`} className="text-xs text-[var(--text)]">
                <span className="font-semibold uppercase tracking-wider text-[var(--text)]">Goal</span> {goal}
              </p>
            )}
            {background && (
              <p data-ui={`${dataUiScope}.context.background`} className="mt-1 text-xs text-[var(--subtext1)]">
                <span className="font-semibold uppercase tracking-wider text-[var(--text)]">Background</span> {background}
              </p>
            )}
          </div>
        )}
        {heading != null ? (
          <p data-ui={`${dataUiScope}.count`} className="mb-2 text-xs text-[var(--subtext1)]">
            Review-Runden ({reviews.length})
          </p>
        ) : (
          <div className="flex items-center justify-between mb-2">
            <h2 data-ui={`${dataUiScope}.count`} className="font-bold text-sm text-[var(--subtext0)]">
              Review-Runden ({reviews.length})
            </h2>
            {addRoundButton}
          </div>
        )}

        {reviews.length === 0 && (
          <p data-ui={`${dataUiScope}.empty`} className="text-sm text-[var(--subtext1)]">
            Noch keine Reviews
          </p>
        )}

        {reviews.map((r, idx) => {
          const isLast = idx === reviews.length - 1
          return (
            <div
              key={r.id}
              data-ui={`${dataUiScope}.round.${r.id}`}
              className={`py-3 ${isLast ? '' : 'border-b border-[var(--surface0)]'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {onSelectRound ? (
                  <Button
                    onClick={() => onSelectRound(r)}
                    variant="ghost"
                    size="sm"
                    data-ui={`${dataUiScope}.round.number`}
                    className="px-1 text-[var(--accent-info)]"
                  >
                    Runde {reviews.length - idx}
                  </Button>
                ) : (
                  <span data-ui={`${dataUiScope}.round.number`} className="text-xs font-semibold">
                    Runde {reviews.length - idx}
                  </span>
                )}
                {r.review_status && (
                  <StatusBadge status={verdictStatus(r.review_status)} appearance="tint" data-ui={`${dataUiScope}.round.verdict`} />
                )}
                <span data-ui={`${dataUiScope}.round.time`} className="text-xs ml-auto text-[var(--subtext1)]">
                  {r.created_at ? new Date(r.created_at).toLocaleString('de-DE') : ''}
                </span>
              </div>
              {r.userStories?.length > 0 && (
                <ul data-ui={`${dataUiScope}.round.${r.id}.stories`} className="list-none p-0 m-0 mb-1.5">
                  {r.userStories.map((us) => {
                    const v = US_VERDICT[us.verdict] || US_VERDICT.open
                    return (
                      <li
                        key={us.key}
                        data-ui={`${dataUiScope}.story-${us.key}`}
                        className="flex items-center gap-2 py-1"
                      >
                        <span className="min-w-0 flex-1 text-xs text-[var(--text)]">{us.title}</span>
                        <Badge tone={v.tone} appearance="tint" size="sm">{v.label}</Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
              {r.notes && (
                <div
                  data-ui={`${dataUiScope}.round.notes`}
                  className="text-xs text-[var(--subtext1)]"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(r.notes) }}
                />
              )}
              {r.screenshots?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {r.screenshots.map((s) => (
                    <a
                      key={s.id}
                      href={`/uploads/${s.file_path}`}
                      data-ui={`${dataUiScope}.round.screenshot.${s.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={`/uploads/${s.file_path}`} alt="Screenshot" className="w-20 h-20 object-cover rounded" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </WidgetBase>

      {feedback.length > 0 && (
        <Card tone="transparent" bordered={false} className="rounded-xl mb-3" data-ui={`${dataUiScope}.history`}>
          <h2 data-ui={`${dataUiScope}.history.heading`} className="font-bold text-sm mb-3 text-[var(--subtext0)]">
            Ältere Review-Historie
          </h2>
          <div className="space-y-3">
            {feedback.map((fb) => (
              <div
                key={fb.id}
                data-ui={`${dataUiScope}.history.item.${fb.id}`}
                className={`p-3 rounded-lg review-${fb.status}`}
              >
                <div className="flex items-center gap-2 text-xs mb-1 text-[var(--subtext0)]">
                  <span className="font-semibold uppercase">{fb.status.replace('_', ' ')}</span>
                  <span>{new Date(fb.created_at).toLocaleString('de-DE')}</span>
                </div>
                {fb.comment && <p className="text-sm">{fb.comment}</p>}
                {fb.screenshots?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {fb.screenshots.map((s) => (
                      <a
                        key={s.id}
                        href={`/uploads/${s.file_path}`}
                        data-ui={`${dataUiScope}.history.item.${fb.id}.screenshot.${s.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img src={`/uploads/${s.file_path}`} alt="Screenshot" className="w-20 h-20 object-cover rounded" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
