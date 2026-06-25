// DD-633 (F1, Slice B) — FabRadial: FAB-Radial-Action-Hub (mobile). Cutover der
// SOLL-Story (AppShell.stories.jsx FabButton + RadialActions) in ein echtes
// Organism. KEIN Nav-Hub — genau 3 kontextuelle Aktionen (D01/D05): New Issue →
// Backlog, aktuelles Review, Quick-Switcher. PO-abgenommen (project_memory #316):
// Position unten-rechts, Scrim + 3 vertikal gestapelte Aktions-Reihen.
//
// Vertrag (SOLL): runder FAB unten-rechts data-ui="app-shell.fab-radial.open"
// (aria-expanded, Plus↔X); expanded → Scrim "app-shell.fab-radial.scrim" + je
// Aktion "app-shell.fab-radial.action.<id>" (Label + ≥44px-Icon). Sichtbar <lg.

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { FilePlus2, ClipboardCheck, LayoutGrid } from 'lucide-react'
import FabRadial from '../../apps/frontend/src/components/ui/organisms/FabRadial.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const ACTIONS = [
  { id: 'new-issue', label: 'New Issue → Backlog', icon: FilePlus2 },
  { id: 'review', label: 'Aktuelles Review', icon: ClipboardCheck },
  { id: 'switcher', label: 'Quick-Switcher', icon: LayoutGrid },
]

const render = (props = {}) =>
  renderToStaticMarkup(<FabRadial actions={ACTIONS} {...props} />)

describe('DD-633 FabRadial — collapsed', () => {
  test('rendert den FAB-Öffner mit Shell-Anker, aria-expanded=false, Plus-Icon', () => {
    const html = render({ open: false })
    expect(html).toContain('data-ui="app-shell.fab-radial.open"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('lucide-plus')
  })

  test('zeigt collapsed KEINEN Scrim und KEINE Aktionen', () => {
    const html = render({ open: false })
    expect(html).not.toContain('app-shell.fab-radial.scrim')
    expect(html).not.toContain('app-shell.fab-radial.action.')
  })

  test('ist <lg sichtbar, ≥lg ausgeblendet (Desktop hat keinen FAB)', () => {
    const html = render({ open: false })
    expect(html).toContain('lg:hidden')
  })
})

describe('DD-633 FabRadial — expanded', () => {
  test('aria-expanded=true + X-Icon + Scrim-Anker', () => {
    const html = render({ open: true })
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('lucide-x')
    expect(html).toContain('data-ui="app-shell.fab-radial.scrim"')
  })

  test('rendert GENAU die 3 Aktions-Anker (D01/D05)', () => {
    const html = render({ open: true })
    for (const a of ACTIONS) {
      expect(html).toContain(`data-ui="app-shell.fab-radial.action.${a.id}"`)
    }
    const count = (html.match(/app-shell\.fab-radial\.action\./g) || []).length
    expect(count).toBe(3)
  })

  test('Aktions-Icon-Target ≥44px (w-11 h-11)', () => {
    const html = render({ open: true })
    expect(html).toContain('w-11 h-11')
  })
})

describe('DD-633 FabRadial — Verdrahtung (Source)', () => {
  const src = () => read('apps/frontend/src/components/ui/organisms/FabRadial.jsx')

  test('FAB-Klick delegiert an onToggle()', () => {
    expect(src()).toMatch(/onToggle\?\.\(\)/)
  })

  test('Aktions-Klick delegiert an onAction(id)', () => {
    expect(src()).toMatch(/onAction\?\.\(\s*\w+\.id\s*\)/)
  })
})
