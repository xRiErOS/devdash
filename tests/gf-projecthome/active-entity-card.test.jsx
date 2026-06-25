import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import ActiveEntityCard from '../../src/components/ui/molecules/ActiveEntityCard.jsx'

const M = { id: 'MS-3', title: 'M2 Roadmap Foundation', goal: 'Schema + UI für Roadmap-Boards', pills: [{ k: 'status', value: 'aktiv' }] }

describe('ActiveEntityCard', () => {
  test('rendert data-ui="active-entity-card" + EntityDetailHeader (id+title)', () => {
    const out = html(<ActiveEntityCard {...M} open={false} />)
    expect(out).toContain('data-ui="active-entity-card"')
    expect(out).toContain('MS-3')
    expect(out).toContain('M2 Roadmap Foundation')
  })
  test('Goal-Region immer im DOM (a11y), mit id; collapsed → hidden + aria-expanded=false + Marker ▸', () => {
    const out = html(<ActiveEntityCard {...M} open={false} dataUi="active-milestone" />)
    expect(out).toContain('id="active-milestone-goal"')
    expect(out).toContain('Schema + UI für Roadmap-Boards')
    expect(out).toMatch(/data-ui="active-milestone\.goal"[^>]*hidden/)
    expect(out).toContain('aria-expanded="false"')
    expect(out).toContain('▸')
  })
  test('open: Goal sichtbar (kein hidden), Marker ▾, aria-expanded=true', () => {
    const out = html(<ActiveEntityCard {...M} open dataUi="active-milestone" />)
    expect(out).not.toMatch(/data-ui="active-milestone\.goal"[^>]*hidden/)
    expect(out).toContain('▾')
    expect(out).toContain('aria-expanded="true"')
  })
  test('Toggle: data-ui .toggle + aria-controls→goal-id + aria-label', () => {
    const out = html(<ActiveEntityCard {...M} open={false} dataUi="active-milestone" />)
    expect(out).toContain('data-ui="active-milestone.toggle"')
    expect(out).toContain('aria-controls="active-milestone-goal"')
    expect(out).toContain('aria-label="Ziel ausklappen"')
  })
})
