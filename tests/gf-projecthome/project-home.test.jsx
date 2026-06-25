import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import ProjectHome from '../../src/components/ui/organisms/ProjectHome.jsx'

const DATA = {
  project: { id: 2, key: 'DD', title: 'DeveloperDashboard', goal: 'Sprint-Tool', status: 'active' },
  meta: [{ label: 'Prefix', value: 'DD' }, { label: 'Offene Issues', value: 12 }],
  goalBlocks: [],
  activeMilestone: { id: 'MS-2', title: 'M2 Roadmap Foundation', goal: 'Schema + UI', pills: [{ k: 'status', value: 'aktiv' }] },
  activeSprint: { id: 'DD#41', title: 'Review-V2', goal: 'ReviewFlow', pills: [{ k: 'status', value: 'läuft' }] },
  priorityBacklog: [{ key: 'DD-375', label: 'Capture-Host Allowlist', status: 'refined' }],
  todos: [{ id: 1, label: 'Capture-Host Allowlist refinen', done: false }],
}

describe('ProjectHome — recipe composition', () => {
  test('Wurzel data-ui="project-home" + Layer-2-Region', () => {
    const out = html(<ProjectHome {...DATA} />)
    expect(out).toContain('data-ui="project-home"')
    expect(out).toContain('var(--layer-2)')
  })
  test('eigene Slot-Anker content + meta (project-home.slot.*)', () => {
    const out = html(<ProjectHome {...DATA} />)
    expect(out).toContain('project-home.slot.content')
    expect(out).toContain('project-home.slot.meta')
  })
  test('aktiver Meilenstein + Sprint (ein Slot, gestapelt)', () => {
    const out = html(<ProjectHome {...DATA} />)
    expect(out).toContain('project-home.slot.active')
    expect(out).toContain('data-ui="active-milestone"')
    expect(out).toContain('data-ui="active-sprint"')
  })
  test('Prio-1-Backlog rendert Label (nicht leer)', () => {
    const out = html(<ProjectHome {...DATA} />)
    expect(out).toContain('project-home.slot.backlog')
    expect(out).toContain('Capture-Host Allowlist')
  })
  test('S2: slot.todos rendert echtes TodoWidget (kein Platzhalter mehr)', () => {
    const out = html(<ProjectHome {...DATA} />)
    expect(out).toContain('project-home.slot.todos')
    expect(out).toContain('data-ui="todo-widget"')
    expect(out).not.toContain('Widget folgt in S2')
  })
  test('S2-D1: sstd + sessionnotes raus aus ProjectHome (eigene Tabs, PO-R2/S2-D1)', () => {
    const out = html(<ProjectHome {...DATA} />)
    expect(out).not.toContain('project-home.slot.sstd')
    expect(out).not.toContain('project-home.slot.sessionnotes')
  })
  test('State_Empty: kein aktiver MS/Sprint → kein Crash', () => {
    const out = html(<ProjectHome {...DATA} activeMilestone={null} activeSprint={null} priorityBacklog={[]} />)
    expect(out).toContain('data-ui="project-home"')
  })
})
