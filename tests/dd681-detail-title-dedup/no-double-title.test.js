import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// DD-681 (r4) — Issue-Titel an die EINE fixe app-shell.sub-header-Position gehoist,
// NICHT zusaetzlich im Desktop-Pane-Header.
//
// Reject-Verlauf:
//  R2: Titel doppelt (Sub-Header-Spiegel + Pane-Header).
//  R3: usePageTitle entfernt → "genau das falsche Element entfernt" (PO).
//  R4 (PO-Direktive): "issue-detail.header.title-display => verschieben nach
//     app-shell.sub-header". Der Titel gehoert — wie bei allen Views (DD-671/670
//     Hoist) — an die fixe Sub-Header-Position (usePageTitle, read-only); der
//     Desktop-Pane-Header (isCommandCenter `headerSlot`, = master-detail.pane-header)
//     rendert den Titel NICHT mehr selbst. PO-Wahl: read-only im Sub-Header,
//     Inline-Edit raus aus dem Pane-Header.
//
// env=node: reiner Source-Audit; das visuelle Single-Title-Verhalten wird per
// Live-Visual-QA @1280 belegt.

const ROOT = process.cwd()
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

describe('DD-681 (r4) · Issue-Titel in den Sub-Header gehoist', () => {
  const src = read('src/views/ItemDetail.jsx')

  test('ItemDetail publiziert den Titel in den app-shell.sub-header (usePageTitle)', () => {
    expect(src, 'usePageTitle-Import fehlt').toMatch(
      /import\s*\{[^}]*usePageTitle[^}]*\}\s*from\s*['"][^'"]*lib\/pageChrome\.jsx['"]/,
    )
    expect(src, 'usePageTitle wird nicht aufgerufen').toMatch(/usePageTitle\s*\(/)
  })

  test('Der Desktop-Pane-Header (isCommandCenter headerSlot) rendert den Titel NICHT mehr', () => {
    const start = src.indexOf('const headerSlot = (')
    const end = src.indexOf('const metaSlot', start)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const headerSlot = src.slice(start, end)
    expect(
      headerSlot,
      'Desktop-Pane-Header traegt noch issue-detail.header.title-display (Doppel-Titel)',
    ).not.toContain('issue-detail.header.title-display')
  })
})
