// DD2-141 (Sub: DD2-92/95/96) — devd_sprint_context Markdown-Serialisierung.
// Ein gemeinsamer additiver Serialisierungs-Pfad (pure function), der zusätzlich zu
// den Basis-Feldern auch Dependencies (DD2-92), Result-Felder (DD2-95) und
// User-Stories inkl. QA (DD2-96) rendert. Pure: keine Express-/DB-Abhängigkeit.

import { describe, test, expect } from 'vitest'
import { buildSprintContextMarkdown } from '../../apps/backend/src/lib/sprintContext.js'

function makeSprint(overrides = {}) {
  return {
    id: 1,
    key: 'DD2#26',
    name: 'devd MCP optimieren',
    status: 'active',
    start_date: null,
    end_date: null,
    capacity: null,
    goal: 'Sprint goal text',
    notes: null,
    dependencies: { predecessors: [], successors: [] },
    ...overrides,
  }
}

function makeItem(overrides = {}) {
  return {
    id: 10,
    key: 'DD2-92',
    title: 'Some issue',
    type: 'improvement',
    status: 'in_progress',
    priority: 3,
    goal: null,
    background: null,
    context_notes: null,
    relevant_files: null,
    user_stories: [],
    dependencies: { blockers: [], blocked_by: [] },
    review_status: null,
    review_comment: null,
    po_notes: null,
    ...overrides,
  }
}

describe('DD2-141 — buildSprintContextMarkdown', () => {
  test('Basis: Sprint-Header + Goal + Issue-Zeile bleiben erhalten (Back-Compat)', () => {
    const md = buildSprintContextMarkdown(makeSprint(), [makeItem()])
    expect(md).toContain('# Sprint: DD2#26 — devd MCP optimieren')
    expect(md).toContain('**Goal:** Sprint goal text')
    expect(md).toContain('### DD2-92: Some issue')
    expect(md).toContain('**Type:** improvement  **Status:** in_progress  **Priority:** medium')
  })

  test('DD2-96: User-Stories inkl. QA werden gerendert', () => {
    const item = makeItem({
      user_stories: [
        { key: 'US-1', title: 'Als Agent sehe ich QA', qa: 'Aktion X → erwartetes Y', us_verdict: 'open' },
      ],
    })
    const md = buildSprintContextMarkdown(makeSprint(), [item])
    expect(md).toContain('User Stories (1)')
    expect(md).toContain('US-1')
    expect(md).toContain('Als Agent sehe ich QA')
    expect(md).toContain('Aktion X → erwartetes Y')
    expect(md).toContain('[open]')
  })

  test('DD2-92: Issue-Dependencies (blockers/blocked_by) werden gerendert', () => {
    const item = makeItem({
      dependencies: {
        blockers: [{ id: 5, title: 'Vorgänger', status: 'done' }],
        blocked_by: [{ id: 7, title: 'Nachfolger', status: 'new' }],
      },
    })
    const md = buildSprintContextMarkdown(makeSprint(), [item])
    expect(md).toContain('Dependencies')
    expect(md).toContain('Vorgänger')
    expect(md).toContain('Nachfolger')
  })

  test('DD2-92: Sprint-Dependencies (predecessors/successors) werden gerendert', () => {
    const sprint = makeSprint({
      dependencies: {
        predecessors: [{ id: 2, name: 'Vor-Sprint' }],
        successors: [{ id: 3, name: 'Folge-Sprint' }],
      },
    })
    const md = buildSprintContextMarkdown(sprint, [makeItem()])
    expect(md).toContain('Sprint Dependencies')
    expect(md).toContain('Vor-Sprint')
    expect(md).toContain('Folge-Sprint')
  })

  test('Leere Zusatz-Felder erzeugen keine Sektionen (kein Rauschen)', () => {
    const md = buildSprintContextMarkdown(makeSprint(), [makeItem()])
    expect(md).not.toContain('Dependencies')
    expect(md).not.toContain('Sprint Dependencies')
    expect(md).not.toContain('User Stories')
    expect(md).not.toContain('**Result:**')
  })
})
