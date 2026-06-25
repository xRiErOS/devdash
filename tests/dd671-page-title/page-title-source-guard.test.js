import { describe, test, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// DD-671 / DD#82-r2 — Source-Guard für den Seitentitel-Hoist.
//
// Architektur seit DD#82-r2: der Seitentitel wird NICHT mehr je View selbst
// gerendert, sondern an EINER fixen Shell-Position (app-shell.sub-header) über
// das PageTitle-Atom. Jede Nav-View publiziert ihren Titel via usePageTitle();
// der Sub-Header (Layout.jsx) liest ihn via usePageChromeTitle() und rendert das
// Atom. Dieser Guard friert genau diese Invariante ein (vorher: PageTitle inline
// je View — abgelöst, weil die divergenten y-Positionen beim View-Wechsel
// sprangen, Reject-Grund Runde 1).
//
// env=node: reiner Source-Audit. Der Render-Vertrag des Atoms wird in
// page-title.test.jsx geprüft, die Pfad-Auflösung in
// tests/dd82-r2-page-chrome/resolve-chrome-title.test.js.

const ROOT = process.cwd()
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const ATOM = 'src/components/ui/atoms/PageTitle.jsx'
const LAYOUT = 'src/components/ui/layout/Layout.jsx'
const CHROME = 'src/lib/pageChrome.jsx'

describe('DD#82-r2 · Seitentitel-Hoist Source-Guard', () => {
  test('PageTitle-Atom existiert und exportiert default', () => {
    expect(existsSync(join(ROOT, ATOM))).toBe(true)
    expect(read(ATOM)).toMatch(/export default function PageTitle/)
  })

  test('pageChrome-Context exportiert Hook + Provider + pure Resolver', () => {
    expect(existsSync(join(ROOT, CHROME))).toBe(true)
    const src = read(CHROME)
    expect(src).toMatch(/export function usePageTitle/)
    expect(src).toMatch(/export function usePageChromeTitle/)
    expect(src).toMatch(/export function PageChromeProvider/)
    expect(src).toMatch(/export function resolveChromeTitle/)
  })

  test('Sub-Header rendert den EINEN Titel (PageTitle + app-shell.sub-header.title) via usePageChromeTitle', () => {
    const src = read(LAYOUT)
    expect(src).toMatch(/import\s+PageTitle\s+from\s+['"][^'"]*atoms\/PageTitle\.jsx['"]/)
    expect(src).toMatch(/usePageChromeTitle/)
    expect(src).toContain('<PageTitle')
    expect(src).toContain('app-shell.sub-header.title')
    expect(src).toMatch(/<PageChromeProvider>/)
  })

  // Die Nav-Views publizieren ihren Titel via usePageTitle() und rendern KEINEN
  // eigenen Page-Title (<h1> / <PageTitle>) mehr inline.
  const hoistedViews = [
    'src/views/ProjectHomeView.jsx',
    'src/views/RoadmapBoard.jsx',
    'src/views/BacklogPage.jsx',
    'src/views/ProjectMemoryView.jsx',
    'src/views/SprintReviewV2.jsx',
    'src/views/SprintDetail.jsx',
    'src/views/DependencyGraph.jsx',
  ]

  for (const rel of hoistedViews) {
    test(`${rel} publiziert den Titel via usePageTitle()`, () => {
      const src = read(rel)
      expect(src).toMatch(/usePageTitle\s*\(/)
      expect(src).toMatch(/import\s*\{[^}]*usePageTitle[^}]*\}\s*from\s*['"][^'"]*lib\/pageChrome\.jsx['"]/)
    })

    test(`${rel} rendert keinen eigenen inlinen <PageTitle> / Page-<h1> mehr`, () => {
      const src = read(rel)
      expect(src, `${rel} enthält noch <PageTitle`).not.toContain('<PageTitle')
      expect(src, `${rel} enthält noch ein inlines <h1>`).not.toMatch(/<h1[\s>]/)
    })
  }

  // MemoryView ist die GLOBALE /memories/global-Route — sie liegt ausserhalb des
  // Layouts (kein App-Shell-Sub-Header) und behält daher ihren eigenen
  // PageTitle. Bewusst NICHT Teil des Hoists.
  test('MemoryView (global, ausserhalb Layout) behält seinen eigenen PageTitle', () => {
    const src = read('src/views/MemoryView.jsx')
    expect(src).toContain('<PageTitle')
  })
})
