// E01.1 — user_stories[] Zod-Contract (TDD). Contract = Single Source; REST/CLI/MCP
// leiten ab (CONTRACT-GATEWAY-PATTERN). Backend-B02: Spalte heisst us_verdict (NICHT
// verdict — Kollisions-Schutz ggue Issue-review_status). D09: acceptance_criteria +
// test_instruction werden issue-level ABGELOEST (harter Replace).
import { describe, it, expect } from 'vitest'
import {
  USER_STORY_VERDICTS,
  userStoryContract,
  userStoryCreateContract,
  userStoryUpdateContract,
  userStoryVerdictContract,
} from '@devd/api-types/userStory.contracts.js'
import { issueCreateContract, issueUpdateContract } from '@devd/api-types/backlog.contracts.js'

describe('E01.1 USER_STORY_VERDICTS', () => {
  it('ist die us_verdict-Taxonomie {open,accepted,rejected} in load-bearing-Reihenfolge', () => {
    expect(USER_STORY_VERDICTS).toEqual(['open', 'accepted', 'rejected'])
  })
})

describe('E01.1 userStoryCreateContract', () => {
  it('akzeptiert title-only (details/qa/position optional)', () => {
    const r = userStoryCreateContract.safeParse({ title: 'Als PO wechsle ich Projekt' })
    expect(r.success).toBe(true)
  })
  it('akzeptiert details + qa + position', () => {
    const r = userStoryCreateContract.safeParse({ title: 'T', details: 'd', qa: 'q', position: 2 })
    expect(r.success).toBe(true)
  })
  it('lehnt leeren title ab (Pflichtfeld)', () => {
    const r = userStoryCreateContract.safeParse({ title: '  ' })
    expect(r.success).toBe(false)
  })
  it('coerced position auf int, lehnt Nicht-Ganzzahl ab', () => {
    expect(userStoryCreateContract.safeParse({ title: 'T', position: '3' }).success).toBe(true)
    expect(userStoryCreateContract.safeParse({ title: 'T', position: 1.5 }).success).toBe(false)
  })
  it('traegt KEIN us_verdict beim Anlegen (default open in Lib)', () => {
    const r = userStoryCreateContract.safeParse({ title: 'T', us_verdict: 'accepted' })
    // us_verdict ist im Create-Contract nicht vorgesehen — wird (falls strict) ignoriert/gestrippt
    expect(r.success).toBe(true)
    expect(r.data.us_verdict).toBeUndefined()
  })
})

describe('E01.1 userStoryUpdateContract', () => {
  it('alle Felder optional (Partial-Update)', () => {
    expect(userStoryUpdateContract.safeParse({}).success).toBe(true)
  })
  it('us_verdict akzeptiert open|accepted|rejected', () => {
    for (const v of USER_STORY_VERDICTS) {
      expect(userStoryUpdateContract.safeParse({ us_verdict: v }).success).toBe(true)
    }
  })
  it('lehnt ungueltiges us_verdict ab', () => {
    expect(userStoryUpdateContract.safeParse({ us_verdict: 'passed' }).success).toBe(false)
  })
  it('qa/details nullable (clearen)', () => {
    expect(userStoryUpdateContract.safeParse({ qa: null, details: null }).success).toBe(true)
  })
})

describe('E01.1 userStoryVerdictContract', () => {
  it('us_verdict Pflicht + Enum', () => {
    expect(userStoryVerdictContract.safeParse({ us_verdict: 'accepted' }).success).toBe(true)
    expect(userStoryVerdictContract.safeParse({}).success).toBe(false)
    expect(userStoryVerdictContract.safeParse({ us_verdict: 'open' }).success).toBe(true)
    expect(userStoryVerdictContract.safeParse({ us_verdict: 'nope' }).success).toBe(false)
  })
})

describe('E01.1 userStoryContract (Read-/Row-Shape)', () => {
  it('validiert eine volle US-Row inkl. us_verdict', () => {
    const row = {
      id: 7, backlog_id: 4101, key: 'US-7', title: 'T',
      details: 'd', qa: 'q', us_verdict: 'open', position: 0,
    }
    expect(userStoryContract.safeParse(row).success).toBe(true)
  })
})

describe('E01.1 D09 — issue-level acceptance_criteria/test_instruction abgeloest', () => {
  it('issueCreateContract traegt acceptance_criteria/test_instruction NICHT mehr', () => {
    const shape = issueCreateContract.shape
    expect(shape).not.toHaveProperty('acceptance_criteria')
    expect(shape).not.toHaveProperty('test_instruction')
  })
  it('issueUpdateContract traegt acceptance_criteria/test_instruction NICHT mehr', () => {
    const shape = issueUpdateContract.shape
    expect(shape).not.toHaveProperty('acceptance_criteria')
    expect(shape).not.toHaveProperty('test_instruction')
  })
})
