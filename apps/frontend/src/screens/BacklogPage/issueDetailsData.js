// GF-2 T2 — issueDetailsData.js
// Pure Helfer: Backlog-Issue (aus GET /api/backlog/:id) → IssueDetails data-Prop.
// Tested via tests/frontend-rework/backlog-issue-details-data.test.js.
// Milestone: read-only Zeile in meta (D04) — KEIN Select.
// Leere Slots → Placeholder-Block (nie undefined/leeres Array ohne Einträge).
import {
  getValidIssueTransitions,
  ISSUE_STATUS_LABELS,
} from '../../lib/issueLifecycleTransitions.js'

// Übergangs-„Richtung" → Button-Tint (Muster der abgelösten BacklogDetails): destruktiv
// = danger, Vorwärts = primary, Rest = secondary (default im Widget).
const TRANSITION_TONE = {
  cancelled: 'danger',
  rejected: 'danger',
  planned: 'primary',
  in_progress: 'primary',
  to_review: 'primary',
  passed: 'primary',
  done: 'primary',
}

/**
 * Baut aus einem angereicherten Backlog-Issue-Objekt und den geladenen sprint-Options
 * das `data`-Prop für IssueDetails (alle 13 Slots: header-felder + description +
 * poNotes + contextNotes + meta + transitions + reviews + dependencies + tags +
 * tagOptions + userStories + attachments + files + memories + activity).
 *
 * @param {object} issue - Angereichertes Issue aus GET /api/backlog/:id
 * @param {Array<{value:string,label:string}>} sprintOptions - Sprint-Dropdown-Optionen
 * @returns {object} data-Prop für <IssueDetails data={...} />
 */
export function toIssueDetailsData(issue, sprintOptions = []) {
  if (!issue) return null
  const id = issue.key ?? issue.id

  // FELD-SCOPE-HINWEIS (T1/T2): goal, background und context_notes werden hier in
  // IssueDetails ANGEZEIGT, sind im IssueForm-edit aber bewusst NICHT editierbar.
  // Editierbarer Scope der IssueForm: title/type/priority/sprint/po_notes/description
  // (Milestone read-only, D04). Der Whitelist-Update-Builder
  // (buildUpdatePayloadFromFormValues) lässt goal/background/context_notes
  // unangetastet → KEIN stiller Datenverlust beim Speichern.
  // ── ContentBlock-Blöcke: description-Sektion (Ziel + Hintergrund + Beschreibung) ──
  const description = [
    {
      key: 'goal',
      label: 'Ziel',
      value: issue.goal ?? '',
      placeholder: 'Kein Ziel hinterlegt.',
    },
    {
      key: 'background',
      label: 'Hintergrund',
      value: issue.background ?? '',
      placeholder: 'Kein Hintergrund hinterlegt.',
    },
    {
      key: 'description',
      label: 'Beschreibung',
      value: issue.description ?? '',
      placeholder: 'Keine Beschreibung hinterlegt.',
    },
  ]

  // ── PO-Notes-Sektion ──
  const poNotes = [
    {
      key: 'po_notes',
      label: 'PO-Notes',
      value: issue.po_notes ?? '',
      placeholder: 'Keine PO-Notes.',
    },
  ]

  // ── Kontext-Sektion ──
  const contextNotes = [
    {
      key: 'context_notes',
      label: 'Kontext',
      value: issue.context_notes ?? '',
      placeholder: 'Kein Kontext hinterlegt.',
    },
  ]

  // ── Metadaten (read-only Label/Wert-Tupel) ──
  // Sprint-Label aus sprintOptions auflösen
  const sprintOpt = sprintOptions.find((s) => String(s.value) === String(issue.assigned_sprint))
  const sprintLabel = sprintOpt?.label ?? (issue.sprint_name ?? '—')

  // Milestone: read-only String-Zeile (D04 — KEIN Select)
  const milestone = issue.milestone ?? '—'

  const meta = [
    ['Key', id],
    ['Status', issue.status ?? '—'],
    ['Typ', issue.type ?? '—'],
    ['Priorität', issue.priority != null ? `P${issue.priority}` : '—'],
    ['Sprint', issue.assigned_sprint != null ? sprintLabel : '—'],
    ['Milestone', milestone],
  ]

  // ── Tags ──
  const tags = issue.tags ?? []
  const tagOptions = issue.tagOptions ?? []

  // ── Relations ──
  const userStories = issue.userStories ?? []
  const dependencies = {
    predecessors: issue.dependencies?.predecessors ?? [],
    successors: issue.dependencies?.successors ?? [],
  }

  // ── Attachments & Memories & Files ──
  const attachments = issue.attachments ?? []
  const files = issue.files ?? []
  const memories = issue.memories ?? []

  // ── Activity ──
  const activity = issue.activity ?? []

  // ── Transitions & Reviews ──
  // Transitions Frontend-abgeleitet aus dem Status (Muster BacklogDetails) — die
  // Detail-API liefert KEINE transitions-Liste, daher hier via Lifecycle-Helper.
  // Delete-Eintrag hängt der Consumer (DetailPane) an, da er onDelete-abhängig ist.
  const transitions = getValidIssueTransitions(issue.status).map((value) => ({
    key: value,
    label: ISSUE_STATUS_LABELS[value] || value,
    variant: TRANSITION_TONE[value] || 'secondary',
  }))
  const reviews = issue.reviews ?? issue.feedback ?? []

  return {
    // Header-Felder
    id,
    title: issue.title ?? '',
    goal: issue.goal ?? '',
    priority: issue.priority,
    status: issue.status,
    type: issue.type,
    // ContentBlock-Slots
    description,
    poNotes,
    contextNotes,
    // MetaDataWidget-Slot (D04: Milestone read-only)
    meta,
    // Widget-Slots
    transitions,
    reviews,
    dependencies,
    tags,
    tagOptions,
    userStories,
    attachments,
    files,
    memories,
    activity,
  }
}
