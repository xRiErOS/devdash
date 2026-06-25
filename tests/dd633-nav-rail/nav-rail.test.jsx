// DD-633 (F1, Slice C) — NavRail: angedockte vertikale Navigation Rail für
// iPad-Landscape (1024–1280). Tablet-Persona der adaptiven Shell zwischen
// Bottom-Tab (Phone, <lg) und Desktop-Sidebar (≥xl). Reuset die presentational
// SidebarBody (Nav-Icons + Projekt-Badge) der IconSidebar, gerahmt als
// docked Rail-Aside. SOLL-Referenz: AppShell.stories.jsx Rail()/IpadLandscapeRail.

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import NavRail from '../../src/components/ui/organisms/NavRail.jsx'

const ITEMS = [
  { key: 'home', label: 'Home', icon: React.createElement('svg') },
  { key: 'roadmap', label: 'Roadmap', icon: React.createElement('svg') },
  { key: 'backlog', label: 'Backlog', icon: React.createElement('svg') },
]
const FOOTER = [{ key: 'settings', label: 'Einstellungen', icon: React.createElement('svg') }]

const render = (props = {}) =>
  renderToStaticMarkup(
    <NavRail items={ITEMS} footerItems={FOOTER} activeKey="home" {...props} />,
  )

describe('DD-633 NavRail — Vertrag', () => {
  test('rendert ein angedocktes Aside mit Shell-Anker', () => {
    const html = render()
    expect(html).toContain('data-ui="app-shell.nav-rail"')
    expect(html).toContain('aria-label="Navigation"')
    expect(html).toContain('<aside')
  })

  test('ist nur im iPad-Landscape-Fenster sichtbar (lg..xl)', () => {
    const html = render()
    // sichtbar ab lg, ausgeblendet ab xl (≥xl übernimmt die Desktop-Sidebar)
    expect(html).toContain('hidden lg:flex')
    expect(html).toContain('xl:hidden')
  })

  test('rendert je Nav-Eintrag einen Rail-Anker', () => {
    const html = render()
    for (const it of ITEMS) {
      expect(html).toContain(`data-ui="app-shell.nav-rail.nav.${it.key}"`)
    }
    expect(html).toContain('data-ui="app-shell.nav-rail.nav.settings"')
  })

  test('markiert den aktiven Eintrag (aria-current=page)', () => {
    const html = render({ activeKey: 'backlog' })
    const idx = html.indexOf('app-shell.nav-rail.nav.backlog')
    const slice = html.slice(Math.max(0, idx - 200), idx)
    expect(slice).toContain('aria-current="page"')
  })

  test('kein Projekt-Badge mehr (DD-664 r3: project-switcher-Anker entfernt, Logo+q reichen)', () => {
    const html = render({ project: { name: 'DevD', prefix: 'DD', color: 'blue' } })
    expect(html).not.toContain('data-ui="app-shell.nav-rail.project-switcher"')
  })
})
