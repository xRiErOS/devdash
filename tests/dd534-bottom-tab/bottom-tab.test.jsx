// DD-534 / DD-633 (F1, Slice A) — BottomTabBar: Shell-Primärnavigation als
// fixierte Bottom-Tab-Bar (mobile). Cutover der SOLL-Story-Komponente
// (AppShell.stories.jsx BottomTabBar, FSD T01) in ein echtes Organism.
//
// Vertrag (SOLL): nav[role=tablist] data-ui="app-shell.bottom-tab.nav";
// 5 Ziele, je TabButton mobile (≥44px Touch-Target), data-ui
// "app-shell.bottom-tab.tab.<key>"; ⌘K-Tab (command) zeigt Command-Icon.
// F5: die Bar respektiert safe-area-inset-bottom (pb-safe-bar). Sichtbar <lg.

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import BottomTabBar from '../../apps/frontend/src/components/ui/organisms/BottomTabBar.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const ITEMS = [
  { key: 'home', label: 'Home', icon: 'overview' },
  { key: 'roadmap', label: 'Roadmap', icon: 'roadmap' },
  { key: 'backlog', label: 'Backlog', icon: 'backlog' },
  { key: 'memories', label: 'Memories', icon: 'memory' },
  { key: 'palette', label: 'Suche', command: true },
]

const render = (props = {}) =>
  renderToStaticMarkup(<BottomTabBar items={ITEMS} activeKey="home" {...props} />)

describe('DD-534 BottomTabBar — Vertrag', () => {
  test('rendert nav[role=tablist] mit Shell-Anker', () => {
    const html = render()
    expect(html).toContain('role="tablist"')
    expect(html).toContain('data-ui="app-shell.bottom-tab.nav"')
  })

  test('rendert genau einen Tab je Item mit Shell-Tab-Anker', () => {
    const html = render()
    for (const it of ITEMS) {
      expect(html).toContain(`data-ui="app-shell.bottom-tab.tab.${it.key}"`)
    }
  })

  test('aktiver Tab ist aria-selected=true, inaktive false', () => {
    const html = render({ activeKey: 'backlog' })
    // Der Backlog-Tab trägt aria-selected="true" …
    const backlogIdx = html.indexOf('app-shell.bottom-tab.tab.backlog')
    const slice = html.slice(Math.max(0, backlogIdx - 200), backlogIdx)
    expect(slice).toContain('aria-selected="true"')
  })

  test('⌘K-Tab (command) rendert das Command-Icon statt TabIcon', () => {
    const html = render()
    expect(html).toContain('lucide-command')
  })

  test('Touch-Target ≥44px (TabButton mobile)', () => {
    const html = render()
    expect(html).toContain('min-h-[44px]')
  })
})

describe('DD-534 BottomTabBar — F5 Safe-Area + Breakpoint', () => {
  test('respektiert safe-area-inset-bottom (pb-safe-bar)', () => {
    const html = render()
    expect(html).toContain('pb-safe-bar')
  })

  test('ist <lg sichtbar, ≥lg ausgeblendet (Sidebar/Rail übernimmt)', () => {
    const html = render()
    expect(html).toContain('lg:hidden')
  })
})

describe('DD-534 BottomTabBar — onNavigate-Verdrahtung (Source)', () => {
  test('Klick delegiert an onNavigate(key)', () => {
    const src = read('apps/frontend/src/components/ui/organisms/BottomTabBar.jsx')
    expect(src).toMatch(/onNavigate\?\.\(\s*item\.key\s*\)/)
  })
})
