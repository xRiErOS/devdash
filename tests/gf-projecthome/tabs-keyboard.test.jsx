import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import Tabs from '../../src/components/ui/molecules/Tabs.jsx'

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'roadmap', label: 'Roadmap' },
]

describe('Tabs — keyboard + WAI Tabs ARIA', () => {
  test('jeder Tab: role=tab + id=tab-<id> + aria-controls=panel-<id>', () => {
    const out = html(<Tabs tabs={TABS} value="home">{() => null}</Tabs>)
    expect((out.match(/role="tab"/g) || []).length).toBe(TABS.length)
    expect(out).toContain('id="tab-home"')
    expect(out).toContain('aria-controls="panel-home"')
  })
  test('aktiver Tab: aria-selected=true (genau einer) + tabIndex 0, Rest -1', () => {
    const out = html(<Tabs tabs={TABS} value="backlog">{() => null}</Tabs>)
    expect((out.match(/aria-selected="true"/g) || []).length).toBe(1)
    expect((out.match(/tabindex="-1"/g) || []).length).toBe(TABS.length - 1)
  })
  test('Panel: role=tabpanel + id=panel-<active> + aria-labelledby=tab-<active>, KEIN tabindex (fokussierbare Kinder, PO-R3)', () => {
    const out = html(<Tabs tabs={TABS} value="roadmap">{() => 'X'}</Tabs>)
    expect(out).toContain('role="tabpanel"')
    expect(out).toContain('id="panel-roadmap"')
    expect(out).toContain('aria-labelledby="tab-roadmap"')
    expect(out).not.toMatch(/data-ui="tabs\.panel"[^>]*tabindex/)
  })
  test('tablist: aria-orientation=horizontal', () => {
    const out = html(<Tabs tabs={TABS} value="home">{() => null}</Tabs>)
    expect(out).toContain('aria-orientation="horizontal"')
  })
})
