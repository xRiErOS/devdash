import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import ProjectPagesTabShell, { PROJECT_TABS } from '../../src/components/ui/organisms/ProjectPagesTabShell.jsx'

const PROJECT = { id: 2, key: 'DD', title: 'DeveloperDashboard', goal: 'Sprint-Tool' }
const HOME = { project: PROJECT, meta: [], activeMilestone: null, activeSprint: null, priorityBacklog: [] }
const SSTD = { slots: [{ key: 'sprint_state', label: 'Sprint State', contentMd: 'x' }], journal: ['j1'] }
const SESSIONNOTES = { notes: [{ id: 'n1', title: 'Note 1' }] }
const SOPS = { sops: [{ key: 's1', title: 'SOP 1' }], collections: [{ id: 'c1', name: 'Col', sopKeys: ['s1'] }] }

const ALL = { project: PROJECT, home: HOME, sstd: SSTD, sessionnotes: SESSIONNOTES, sops: SOPS }

describe('ProjectPagesTabShell', () => {
  test('Tab-Inventar ≤ 9 (D-F), Home zuerst', () => {
    expect(PROJECT_TABS.length).toBeLessThanOrEqual(9)
    expect(PROJECT_TABS[0].id).toBe('home')
  })
  test('data-ui="project-pages" + Projekt-Header (Titel)', () => {
    const out = html(<ProjectPagesTabShell {...ALL} />)
    expect(out).toContain('data-ui="project-pages"')
    expect(out).toContain('DeveloperDashboard')
  })
  test('Tablist mit N role=tab Buttons', () => {
    const out = html(<ProjectPagesTabShell {...ALL} />)
    expect((out.match(/role="tab"/g) || []).length).toBe(PROJECT_TABS.length)
  })
  test('Home aktiv → ProjectHome', () => {
    expect(html(<ProjectPagesTabShell {...ALL} activeTab="home" />)).toContain('data-ui="project-home"')
  })

  // T2 (S3): die übrigen drei Tabs verdrahten echte Bestands-/S2-Widgets statt Platzhalter.
  test('SSTD-Tab → SstdSlotsWidget', () => {
    const out = html(<ProjectPagesTabShell {...ALL} activeTab="sstd" />)
    expect(out).toContain('data-ui="sstd-slots"')
    expect(out).not.toContain('data-ui="project-pages.placeholder"')
  })
  test('Session-Notes-Tab → SessionNotesWidget', () => {
    const out = html(<ProjectPagesTabShell {...ALL} activeTab="sessionnotes" />)
    expect(out).toContain('data-ui="session-notes"')
    expect(out).not.toContain('data-ui="project-pages.placeholder"')
  })
  test('SOPs-Tab → SopCollectionsView', () => {
    const out = html(<ProjectPagesTabShell {...ALL} activeTab="sops" />)
    expect(out).toContain('data-ui="sop-collections"')
    expect(out).not.toContain('data-ui="project-pages.placeholder"')
  })
  test('Unbekannter Tab → defensiver Platzhalter (Fallback)', () => {
    const out = html(<ProjectPagesTabShell {...ALL} activeTab="__unknown__" />)
    expect(out).toContain('data-ui="project-pages.placeholder"')
  })
})
