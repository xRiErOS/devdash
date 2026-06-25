import { describe, test, expect } from 'vitest'
import {
  getValidIssueTransitions,
  ISSUE_STATUS_LABELS,
  REQUIRES_NOTES,
} from '../../src/lib/issueLifecycleTransitions.js'

describe('T04 — Issue-Lifecycle-Transitions (Backend-konform)', () => {
  test('new bietet [refined, cancelled]', () => {
    expect(getValidIssueTransitions('new')).toEqual(['refined', 'cancelled'])
  })

  test('refined bietet planned + new + cancelled', () => {
    expect(getValidIssueTransitions('refined')).toEqual(['planned', 'new', 'cancelled'])
  })

  test('planned bietet in_progress + refined + cancelled (NICHT new — Backend lehnt ab)', () => {
    const t = getValidIssueTransitions('planned')
    expect(t).toContain('in_progress')
    expect(t).toContain('refined')
    expect(t).toContain('cancelled')
    expect(t).not.toContain('new')
  })

  test('in_progress bietet to_review + planned + cancelled', () => {
    const t = getValidIssueTransitions('in_progress')
    expect(t).toContain('to_review')
    expect(t).toContain('planned')
    expect(t).toContain('cancelled')
  })

  test('to_review bietet passed + rejected + planned + cancelled (NICHT in_progress — Backend)', () => {
    const t = getValidIssueTransitions('to_review')
    expect(t).toContain('passed')
    expect(t).toContain('rejected')
    expect(t).toContain('planned')
    expect(t).toContain('cancelled')
    expect(t).not.toContain('in_progress')
  })

  test('B01-FIX: passed bietet KEIN done (Backend nur via isSystemTransition)', () => {
    const t = getValidIssueTransitions('passed')
    expect(t).not.toContain('done')
    expect(t).toContain('planned')
    expect(t).toContain('cancelled')
  })

  test('rejected bietet in_progress + planned + cancelled (NICHT refined — Backend lehnt ab)', () => {
    const t = getValidIssueTransitions('rejected')
    expect(t).toContain('in_progress')
    expect(t).toContain('planned')
    expect(t).toContain('cancelled')
    expect(t).not.toContain('refined')
  })

  test('done bietet [planned, cancelled] (Wildcard-Reopen)', () => {
    expect(getValidIssueTransitions('done')).toEqual(['planned', 'cancelled'])
  })

  test('cancelled bietet [refined] (Wildcard-Reopen)', () => {
    expect(getValidIssueTransitions('cancelled')).toEqual(['refined'])
  })

  test('Unbekannter Status liefert leeres Array', () => {
    expect(getValidIssueTransitions('foo')).toEqual([])
    expect(getValidIssueTransitions(undefined)).toEqual([])
  })

  test('Alle Source-Statuses haben deutsche Labels', () => {
    for (const s of ['new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'rejected', 'done', 'cancelled']) {
      expect(ISSUE_STATUS_LABELS[s], `Label fehlt für ${s}`).toBeTypeOf('string')
    }
  })

  test('REQUIRES_NOTES enthält "cancelled" (Backend-Vorgabe)', () => {
    expect(REQUIRES_NOTES.has('cancelled')).toBe(true)
    expect(REQUIRES_NOTES.has('done')).toBe(false)
  })

  test('Selbst-Übergang ist niemals in Map (no-op-Schutz)', () => {
    for (const s of ['new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'rejected', 'done', 'cancelled']) {
      expect(getValidIssueTransitions(s), `${s} → ${s}`).not.toContain(s)
    }
  })
})
