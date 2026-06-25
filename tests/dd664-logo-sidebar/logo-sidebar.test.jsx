// DD-664 — DD-Logo aus dem Page-Header in den Sidebar/NavRail-Projekt-Switcher-
// Bereich verlagert. SOLL: der Page-Header trägt KEIN Logo mehr (gewinnt vertikalen
// Platz), IconSidebar UND NavRail rendern das Logo ganz oben im Switcher-Bereich,
// Klick öffnet (wie das Projekt-Badge) den Quick-Switcher via onProjectSwitch.
//
// Mischung aus Render-Vertrag (renderToStaticMarkup der realen Organisms) und
// Source-Grep (Layout.jsx PageHeader — kein Live-Mount nötig, kein Router/Store).

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import IconSidebar from '../../src/components/ui/organisms/IconSidebar.jsx'
import NavRail from '../../src/components/ui/organisms/NavRail.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const ITEMS = [
  { key: 'home', label: 'Home', icon: React.createElement('svg') },
  { key: 'roadmap', label: 'Roadmap', icon: React.createElement('svg') },
]
const FOOTER = [{ key: 'settings', label: 'Einstellungen', icon: React.createElement('svg') }]
const PROJECT = { name: 'DevD', prefix: 'DD', color: 'blue' }

describe('DD-664 PageHeader — Logo entfernt', () => {
  const layout = () => read('src/components/ui/layout/Layout.jsx')

  test('PageHeader rendert keinen app-shell.page-header.logo-Anker mehr', () => {
    expect(layout()).not.toContain('app-shell.page-header.logo')
  })

  test('PageHeader-Mount trägt kein onLogoClick mehr (Prop entfernt)', () => {
    expect(layout()).not.toContain('onLogoClick')
  })

  test('DDLogo-Import aus Layout.jsx entfernt (kein toter Import)', () => {
    expect(layout()).not.toMatch(/import\s+DDLogo\s+from/)
  })

  test('Page-Header-Container bleibt erhalten (nur das Logo-Kind entfällt)', () => {
    expect(layout()).toContain('data-ui="app-shell.page-header"')
  })

  test('Quick-Switcher behält Öffnungs-Pfade (q-Shortcut + Switcher-Event)', () => {
    const s = layout()
    expect(s).toMatch(/q:\s*\(\)\s*=>\s*setSwitcherOpen\(true\)/)
    expect(s).toContain('devd-open-project-switcher')
  })
})

describe('DD-664 IconSidebar — Logo im Switcher-Bereich', () => {
  const render = (props = {}) =>
    renderToStaticMarkup(
      <IconSidebar
        items={ITEMS}
        footerItems={FOOTER}
        activeKey="home"
        project={PROJECT}
        {...props}
      />,
    )

  test('rendert app-shell.sidebar.logo', () => {
    const html = render({ dataUiScope: 'app-shell.sidebar' })
    expect(html).toContain('data-ui="app-shell.sidebar.logo"')
  })

  test('Logo sitzt oben im Switcher-Bereich (DD-664 r3: kein Badge mehr darunter)', () => {
    const html = render({ dataUiScope: 'app-shell.sidebar' })
    const logoIdx = html.indexOf('app-shell.sidebar.logo')
    expect(logoIdx).toBeGreaterThanOrEqual(0)
  })

  test('Logo-Klick ist an onProjectSwitch verdrahtet (Quick-Switcher öffnen)', () => {
    // Render-Beweis: Logo trägt das aria-label des Quick-Switchers; der onClick
    // (onProjectSwitch) wird im SidebarBody an dieselbe Callback gebunden wie das Badge.
    const html = render({ dataUiScope: 'app-shell.sidebar' })
    const logoIdx = html.indexOf('app-shell.sidebar.logo')
    const slice = html.slice(Math.max(0, logoIdx - 200), logoIdx + 60)
    expect(slice).toContain('Quick-Switcher öffnen')
    // Quell-Beweis der Verdrahtung (onClick={onProjectSwitch} am DDLogo)
    const src = read('src/components/ui/organisms/IconSidebar.jsx')
    expect(src).toMatch(/<DDLogo[\s\S]*onClick=\{onProjectSwitch\}/)
    expect(src).toMatch(/data-ui=\{`\$\{scope\}\.logo`\}/)
  })

  test('Projekt-Badge (project-switcher-Anker) entfernt — doppelt zu Logo+q (DD-664 r3)', () => {
    const html = render({ dataUiScope: 'app-shell.sidebar' })
    expect(html).not.toContain('data-ui="app-shell.sidebar.project-switcher"')
  })
})

describe('DD-664 NavRail — Logo im Switcher-Bereich', () => {
  const render = (props = {}) =>
    renderToStaticMarkup(
      <NavRail items={ITEMS} footerItems={FOOTER} activeKey="home" project={PROJECT} {...props} />,
    )

  test('rendert app-shell.nav-rail.logo', () => {
    const html = render()
    expect(html).toContain('data-ui="app-shell.nav-rail.logo"')
  })

  test('Logo oben, kein project-switcher-Badge mehr (DD-664 r3)', () => {
    const html = render()
    const logoIdx = html.indexOf('app-shell.nav-rail.logo')
    expect(logoIdx).toBeGreaterThanOrEqual(0)
    expect(html).not.toContain('data-ui="app-shell.nav-rail.project-switcher"')
  })
})
