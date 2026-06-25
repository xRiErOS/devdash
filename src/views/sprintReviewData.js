// GF-2 T13 (Cutover) — Datengrenze Sprint-Review-V2. Reine Abbildungs-Helfer zwischen
// der Backend-Sprint-Antwort (GET /api/sprints/:id) und den Props, die die kanonische
// ReviewFlow-Feature-Komposition erwartet. Bewusst frei von React/Fetch (node-env-unit-bar).
//
// BE-B02: die Story-scoped Verdict-Spalte heisst us_verdict (≠ Issue-review_status). Der
// UserStoriesWidget (review-readonly) liest hingegen `verdict`. Dieser Mapper überbrückt die
// Namenskollision an EINER Stelle. Vokabular = GETEILTER Contract (USER_STORY_VERDICTS) —
// kein dupliziertes Literal, sonst Contract-Drift (T13-Drift-Gate, Achse Contract).
import { USER_STORY_VERDICTS } from '../../contracts/userStory.contracts.js'

/**
 * Eine User-Story-Row (Backend liefert us_verdict; Fixtures liefern teils bereits verdict)
 * auf die Widget-Form mit `verdict` abbilden. Unbekannte/fehlende Werte → 'open' (kein Crash).
 * @param {{us_verdict?:string, verdict?:string}} us
 */
export function mapStoryVerdict(us) {
  const raw = us?.us_verdict ?? us?.verdict ?? 'open'
  const verdict = USER_STORY_VERDICTS.includes(raw) ? raw : 'open'
  return { ...us, verdict }
}

/**
 * Backend-Sprint (items[] mit user_stories[].us_verdict + item.review_status aus der
 * Runden-Projektion) → ReviewFlow-Issues. review_status bleibt (BE-Q01: Runden-Projektion
 * trägt den Verdict-Zustand der Liste), nur die Stories werden auf verdict gemappt.
 * @param {{items?:Array<object>}|null|undefined} sprint
 */
export function toReviewIssues(sprint) {
  const items = sprint?.items || []
  return items.map((item) => ({
    ...item,
    user_stories: (item.user_stories || []).map(mapStoryVerdict),
  }))
}
