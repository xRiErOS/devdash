import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReviewFlow from '../components/ui/features/ReviewFlow.jsx'
import ReviewFlowMobile from '../components/ui/features/ReviewFlowMobile.jsx'
import useMediaQuery from '../hooks/useMediaQuery.js'
import { usePageTitle } from '../lib/pageChrome.jsx'
import { parseEntityId } from '../lib/entitySlug.js'
import { toReviewIssues } from './sprintReviewData.js'
import fixtureIssue from '../storybook/01-foundations/01.40-backend-contract/fixtures/review-issue.json'

// GF-2 T13 (Cutover) — V2-Review-View-Container, jetzt gegen die Backend-API verdrahtet.
// Ersetzt src/views/SprintReview.jsx (Replace-not-Refactor, selber Commit). Dünner Container
// um die kanonische ReviewFlow-Feature-Komposition (06.80, status:stable).
//
// Dual-Mode: prop-fed (issuesProp gesetzt) = Story/Test/node-env-Snapshot ohne Fetch; live
// (kein issuesProp, Route-Param :sprintId vorhanden) = Fetch gegen GET /api/sprints/:id +
// Verdict-/Submit-Verdrahtung. Datengrenze us_verdict→verdict via toReviewIssues (BE-B02).

// Toast = projektweites CustomEvent (identisch zur abgelösten SprintReview.jsx).
function toast(message, kind = 'success') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('devd-toast', { detail: { message, kind } }))
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export default function SprintReviewV2({
  issues: issuesProp,
  sprintKey,
  sprintTitle,
  sprintGoal,
  round = 1,
  submitted = false,
  onComplete,
  forceLayout,
}) {
  const params = useParams()
  const sprintId = params?.sprintId != null ? parseEntityId(params.sprintId) : null
  // Live nur, wenn kein expliziter issues-Prop UND ein Route-Sprint vorliegt.
  const live = issuesProp == null && sprintId != null

  const [sprint, setSprint] = useState(null)
  const [rounds, setRounds] = useState([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)

  // --- Fetch: Sprint + Items (mit user_stories) ---
  const loadSprint = useCallback(() => {
    if (!live) return Promise.resolve(null)
    return fetch(`/api/sprints/${sprintId}`)
      .then((r) => r.json())
      .then((data) => { setSprint(data); return data })
      .catch(() => null)
  }, [live, sprintId])

  useEffect(() => { loadSprint() }, [loadSprint])

  // Backend-Shape → ReviewFlow-Issues (us_verdict→verdict an der Datengrenze).
  const liveIssues = useMemo(() => toReviewIssues(sprint), [sprint])
  const issues = issuesProp ?? (live ? liveIssues : [fixtureIssue])
  const key = sprintKey ?? sprint?.key ?? fixtureIssue.sprint_key ?? ''
  usePageTitle(`Review: ${key || 'Sprint'}`)

  const liveRound = sprint?.review_round ?? round
  const submittedState = live ? Boolean(sprint?.review_submitted_at) : submitted

  // Selektiertes Issue (Desktop-Master-Detail).
  const selectedIssue = issues.find((i) => i.key === selectedKey) || issues[0] || null

  // --- Runden des selektierten Issues laden (newest-first) ---
  const loadRounds = useCallback((backlogId) => {
    if (!live || !backlogId) { setRounds([]); return }
    fetch(`/api/backlog/${backlogId}/reviews`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) { setRounds([]); return }
        const mapped = data.map((r) => ({
          id: r.id,
          round_number: r.round_number,
          review_status: r.review_status,
          created_at: r.updated_at || r.created_at,
          notes: r.comment || r.notes || '',
          comment: r.comment || '',
          screenshots: r.screenshots || [],
        }))
        setRounds([...mapped].reverse())
      })
      .catch(() => setRounds([]))
  }, [live])

  // Bei Issue-Wechsel: Notes-Draft vorbelegen + Runden laden (live).
  useEffect(() => {
    if (!live) return
    setComment(selectedIssue?.review_notes || '')
    loadRounds(selectedIssue?.id)
  }, [live, selectedIssue?.id, loadRounds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Aktive (= jüngste) Runde; rounds ist newest-first.
  const activeRound = rounds.length > 0 ? rounds[0] : null
  const activeRoundPending = activeRound && (!activeRound.review_status || activeRound.review_status === 'pending')

  // --- Verdict (D01 binär): pass / reject → passed / not_passed ---
  // pending-Runde patchen, sonst neue Runde atomar mit Verdict anlegen (mirror SprintReview.jsx).
  const applyVerdict = useCallback(async (v, draftComment, issueArg) => {
    const issue = issueArg || selectedIssue
    if (!live || !issue || submittedState) return
    const status = v === 'pass' ? 'passed' : 'not_passed'
    const notes = (draftComment ?? comment).trim() || null
    setSubmitting(true)
    try {
      let res
      if (activeRoundPending && activeRound) {
        const body = { status, notes }
        if (notes) body.comment = notes
        res = await fetch(`/api/reviews/${activeRound.id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) })
      } else {
        const body = { review_status: status, notes }
        if (notes) body.comment = notes
        res = await fetch(`/api/backlog/${issue.id}/reviews`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || `HTTP ${res.status}`)
      }
      await loadSprint()
      loadRounds(issue.id)
      toast(status === 'passed' ? 'Issue als passed bewertet' : 'Issue als not passed bewertet')
    } catch (err) {
      toast(`Review-Update fehlgeschlagen: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }, [live, selectedIssue, submittedState, comment, activeRoundPending, activeRound, loadSprint, loadRounds])

  // --- Per-US-Verdict (#8, D01-Klärung id632): us_verdict open/accepted/rejected je Story.
  // ENTKOPPELT vom Issue-review_status (kein Auto-Derive). PATCH /api/user-stories/:id/verdict.
  // Mobile reicht den aktuellen Pager-Issue als 3. Arg (issueArg); Desktop nutzt selectedIssue.
  const applyUsVerdict = useCallback(async (usKey, us_verdict, issueArg) => {
    const issue = issueArg || selectedIssue
    if (!live || !issue || submittedState) return
    const story = (issue.user_stories || []).find((s) => s.key === usKey)
    if (!story?.id) return
    try {
      const res = await fetch(`/api/user-stories/${story.id}/verdict`, {
        method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ us_verdict }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || `HTTP ${res.status}`)
      }
      await loadSprint()
    } catch (err) {
      toast(`US-Verdict fehlgeschlagen: ${err.message}`, 'error')
    }
  }, [live, selectedIssue, submittedState, loadSprint])

  // --- Re-Review / manueller Reopen (#13, DD-662): entschiedene Runde wieder öffnen
  // (passed/not_passed → frische pending-Runde) via POST /api/backlog/:id/review/reopen.
  // Setzt zugleich den Sprint-Review-Marker zurück (Backend). Pager springt zum Issue.
  const applyReopen = useCallback(async (key) => {
    if (!live) return
    const issue = issues.find((i) => i.key === key)
    if (!issue?.id) return
    try {
      const res = await fetch(`/api/backlog/${issue.id}/review/reopen`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || `HTTP ${res.status}`)
      }
      await loadSprint()
      loadRounds(issue.id)
      setSelectedKey(key)
      toast('Review wieder geöffnet — neue Runde')
    } catch (err) {
      toast(`Reopen fehlgeschlagen: ${err.message}`, 'error')
    }
  }, [live, issues, loadSprint, loadRounds])

  // --- Review abschließen (DD-507 Marker: review_submitted_at) ---
  const submitReview = useCallback(async () => {
    if (onComplete) return onComplete()
    if (!live) return
    try {
      const res = await fetch(`/api/sprints/${sprintId}/review-submit`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || `HTTP ${res.status}`)
      }
      await loadSprint()
      toast('Review abgeschlossen — Ergebnis kopierbar, Edits gesperrt')
    } catch (err) {
      toast(`Review-Abschluss fehlgeschlagen: ${err.message}`, 'error')
    }
  }, [onComplete, live, sprintId, loadSprint])

  // ReviewStep-Props (durch ReviewFlow an die Detail-Einheit gereicht).
  const stepProps = live
    ? {
        disabled: submittedState,
        comment,
        onComment: setComment,
        onSubmit: (v, c) => applyVerdict(v, c),
        onUsVerdict: applyUsVerdict,
        submitting,
        reviews: rounds,
      }
    : (submitted ? { disabled: true } : {})

  // Responsive Conditional-Mount (DD-635): <1024 → Mobile-Pager (FEAT-31), sonst Desktop.
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)
  const layout = forceLayout ?? (isDesktop ? 'desktop' : 'mobile')

  if (layout === 'mobile') {
    return (
      <ReviewFlowMobile
        issues={issues}
        round={liveRound}
        disabled={submittedState}
        submitting={live ? submitting : false}
        comment={live ? comment : ''}
        onComment={live ? setComment : undefined}
        onSubmit={live ? ((v, c, issue) => applyVerdict(v, c, issue)) : undefined}
        onUsVerdict={live ? applyUsVerdict : undefined}
        onReopen={live ? applyReopen : undefined}
      />
    )
  }

  return (
    <ReviewFlow
      issues={issues}
      sprintKey={key}
      sprintTitle={sprintTitle ?? sprint?.name}
      sprintGoal={sprintGoal ?? sprint?.goal}
      round={liveRound}
      selectedKey={selectedKey}
      onSelect={setSelectedKey}
      stepProps={stepProps}
      onComplete={submitReview}
      submitted={submittedState}
    />
  )
}
