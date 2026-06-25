// DD-534 / DD-535 / DD-633 (F1, Slice A) — Shell-Integration: die getestete
// BottomTabBar wird in die echte App-Shell (Layout) verdrahtet und löst den
// Floating-Drawer der IconSidebar ab.
//
// Vertrag:
//  - IconSidebar (presentational, echt gerendert): KEIN Mobile-Drawer mehr —
//    kein mobile-open/mobile-close/scrim/drawer-Anker, kein Burger. Nur das
//    Desktop-Aside (hidden lg:flex) bleibt.
//  - Layout (Source): rendert BottomTabBar mit den 5 Shell-Zielen
//    (home/roadmap/backlog/memories/palette); palette(⌘K) → Quick-Switcher
//    interim; activeKey=sidebarActiveKey; <main> mobil pb-24 lg:pb-6.
//  - DD-535: ShellBreadcrumb mobil in eigener Zeile; pl-16 aus PageHeader +
//    SubHeader entfernt (Burger weg).

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import IconSidebar from '../../src/components/ui/organisms/IconSidebar.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const SIDEBAR_ITEMS = [
  { key: 'home', label: 'Home', icon: React.createElement('svg') },
  { key: 'roadmap', label: 'Roadmap', icon: React.createElement('svg') },
]

const renderSidebar = (props = {}) =>
  renderToStaticMarkup(
    <IconSidebar items={SIDEBAR_ITEMS} footerItems={[]} activeKey="home" dataUiScope="app-shell.sidebar" {...props} />,
  )

describe('DD-534 IconSidebar — Floating-Drawer abgelöst', () => {
  test('rendert keinen Mobile-Drawer-Anker mehr', () => {
    const html = renderSidebar()
    expect(html).not.toContain('app-shell.sidebar.mobile-open')
    expect(html).not.toContain('app-shell.sidebar.mobile-close')
    expect(html).not.toContain('app-shell.sidebar.scrim')
    expect(html).not.toContain('app-shell.sidebar.drawer')
  })

  test('rendert das Desktop-Aside weiter (DD-633 Slice C: ab xl, Rail füllt lg..xl)', () => {
    const html = renderSidebar()
    expect(html).toContain('hidden xl:flex')
    expect(html).toContain('data-ui="app-shell.sidebar"')
  })

  test('Source: drawerOpen-State + Burger + navigateAndClose entfernt', () => {
    const src = read('src/components/ui/organisms/IconSidebar.jsx')
    expect(src).not.toMatch(/drawerOpen/)
    expect(src).not.toMatch(/navigateAndClose/)
    expect(src).not.toMatch(/\bMenu\b/)
  })
})

describe('DD-534 Layout — BottomTabBar verdrahtet', () => {
  const src = () => read('src/components/ui/layout/Layout.jsx')

  test('importiert + rendert BottomTabBar', () => {
    const s = src()
    expect(s).toMatch(/import\s+BottomTabBar\s+from\s+['"][^'"]*organisms\/BottomTabBar\.jsx['"]/)
    expect(s).toMatch(/<BottomTabBar/)
  })

  test('definiert die 5 Shell-Tab-Ziele inkl. palette(⌘K, command)', () => {
    const s = src()
    for (const key of ['home', 'roadmap', 'backlog', 'memories', 'palette']) {
      expect(s).toContain(`key: '${key}'`)
    }
    expect(s).toMatch(/command:\s*true/)
  })

  test('activeKey ist sidebarActiveKey; palette → Quick-Switcher interim', () => {
    const s = src()
    expect(s).toMatch(/<BottomTabBar[\s\S]*activeKey=\{sidebarActiveKey\}/)
    // palette-Tab öffnet interim den Quick-Switcher (PO-Entscheid bis F2/DD-593)
    expect(s).toMatch(/case 'palette':[\s\S]*setSwitcherOpen\(true\)/)
  })

  test('<main> bekommt mobil Bottom-Padding (pb-24 lg:pb-6)', () => {
    const s = src()
    expect(s).toMatch(/data-ui="app-shell\.main"[\s\S]*pb-24 lg:pb-6|pb-24 lg:pb-6[\s\S]*data-ui="app-shell\.main"/)
  })
})

describe('DD-535 Layout — Breadcrumb mobil + pl-16 entfernt', () => {
  const src = () => read('src/components/ui/layout/Layout.jsx')

  test('PageHeader + SubHeader tragen kein pl-16 mehr (Burger weg)', () => {
    const s = src()
    expect(s).not.toContain('pl-16')
  })

  test('ShellBreadcrumb erscheint in einer eigenen mobilen Zeile (lg:hidden)', () => {
    const s = src()
    // genau zwei ShellBreadcrumb-Instanzen: inline (Desktop) + eigene mobile Zeile
    const count = (s.match(/<ShellBreadcrumb/g) || []).length
    expect(count).toBeGreaterThanOrEqual(2)
    expect(s).toMatch(/lg:hidden[\s\S]*<ShellBreadcrumb|<ShellBreadcrumb[\s\S]*lg:hidden/)
  })
})
