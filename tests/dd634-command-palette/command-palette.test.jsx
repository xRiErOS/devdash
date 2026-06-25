// DD-634 (F2) — Command-Palette-Organism: einzige Such-/Sprung-Surface (D02).
// vitest env=node (kein jsdom): SSR-Struktur via renderToStaticMarkup +
// reine Aggregations-Logik (groupResultsByType, aus GlobalSearch projiziert).
// Keyboard-/Klick-Verhalten ist event-getrieben → in node nicht feuerbar; die
// Logik-Wahrheit (Gruppierung/Filter) wird hier direkt, das Wiring im
// Layout-Source-Guard (layout-palette-integration.test.jsx) abgedeckt.

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CommandPalette, {
  groupResultsByType,
  PALETTE_CHIPS,
} from '../../src/components/ui/organisms/CommandPalette.jsx'

const RESULTS = [
  { type: 'milestone', id: 5, key: 'M5', title: 'Mobile UX' },
  { type: 'sprint', id: 81, key: 'DD#81', title: 'Mobile UX' },
  { type: 'issue', id: 634, num: 634, key: 'DD-634', title: 'Command-Palette' },
  { type: 'issue', id: 637, num: 637, key: 'DD-637', title: 'Safe-Area' },
]

describe('DD-634 groupResultsByType — globale Suche projiziert', () => {
  test('gruppiert nach Typ in fixer Reihenfolge milestone→sprint→issue', () => {
    const { groups, flat } = groupResultsByType(RESULTS)
    expect(groups.map((g) => g.type)).toEqual(['milestone', 'sprint', 'issue'])
    expect(flat).toHaveLength(4)
  })

  test('leere Gruppen entfallen', () => {
    const { groups } = groupResultsByType([{ type: 'issue', id: 1, key: 'X-1', title: 'a' }])
    expect(groups.map((g) => g.type)).toEqual(['issue'])
  })

  test('Kategorie-Chips Alle/Milestones/Sprints/Issues', () => {
    expect(PALETTE_CHIPS).toEqual(['Alle', 'Milestones', 'Sprints', 'Issues'])
  })
})

describe('DD-634 CommandPalette — geschlossen', () => {
  test('rendert nichts, wenn open=false', () => {
    const html = renderToStaticMarkup(
      <CommandPalette open={false} value="x" results={RESULTS} onChange={() => {}} onSelect={() => {}} />,
    )
    expect(html).toBe('')
  })
})

describe('DD-634 CommandPalette — offen (eine responsive Surface)', () => {
  const html = () =>
    renderToStaticMarkup(
      <CommandPalette open value="mobile" results={RESULTS} onChange={() => {}} onSelect={() => {}} onClose={() => {}} />,
    )

  test('Scrim + Sheet + Open-Anker (Desktop-Overlay)', () => {
    const h = html()
    expect(h).toContain('data-ui="app-shell.command-palette.scrim"')
    expect(h).toContain('data-ui="app-shell.command-palette.sheet"')
    expect(h).toContain('data-ui="app-shell.command-palette.open"')
  })

  test('Mobile-Affordances: Grabber + Schließen + Kategorie-Chips', () => {
    const h = html()
    expect(h).toContain('data-ui="app-shell.command-palette.grabber"')
    expect(h).toContain('data-ui="app-shell.command-palette.close"')
    expect(h).toContain('data-ui="app-shell.command-palette.chips"')
    for (const c of PALETTE_CHIPS) expect(h).toContain(c)
  })

  test('gruppierte Treffer tragen result-Anker je Key', () => {
    const h = html()
    expect(h).toContain('data-ui="app-shell.command-palette.result.M5"')
    expect(h).toContain('data-ui="app-shell.command-palette.result.DD#81"')
    expect(h).toContain('data-ui="app-shell.command-palette.result.DD-634"')
  })

  test('Desktop-Tastatur-Footer (Navigieren/Öffnen/Schließen)', () => {
    const h = html()
    expect(h).toContain('Navigieren')
    expect(h).toContain('Schließen')
  })
})
