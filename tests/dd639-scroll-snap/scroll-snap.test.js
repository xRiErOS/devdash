// DD-639 (F7) — Mobile Scroll-Snap Primitive (Code-Build der passed SOLL-Story).
// Ein geteiltes, mobil-gegatetes (<768px) CSS-Snap-Primitive: horizontaler
// Spalten-Snap auf dem Roadmap-Board (DD-601-Consumer) + vertikales Snap für
// lange Textfelder/Swimlane (DD-599-Consumer teilt dasselbe Primitive).
// Source-Guard (project_memory 333: env=node, kein echtes Browser-Layout — CSS
// scroll-snap greift nur im echten Scroll; visuelle Abnahme = PO/ADR).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import BoardPage from '../../src/components/ui/templates/BoardPage.jsx'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

describe('DD-639 — Snap-Primitive (Single-Source in index.css, mobil-gegatet)', () => {
  const css = read('src/index.css')

  test('die 4 Snap-Primitive-Klassen sind definiert', () => {
    expect(css).toMatch(/\.snap-scroll-x\s*\{/)
    expect(css).toMatch(/\.snap-col\s*\{/)
    expect(css).toMatch(/\.snap-scroll-y\s*\{/)
    expect(css).toMatch(/\.snap-mark\s*\{/)
  })

  test('das Primitive ist auf Mobile (<768px) gegatet — kein Desktop-Snap', () => {
    // Der Snap-Block liegt innerhalb einer width<768-Media-Query.
    const mobileBlock = css.slice(css.indexOf('.snap-scroll-x'))
    // Vor der ersten Snap-Klasse muss eine width<768-Media-Query stehen.
    const before = css.slice(0, css.indexOf('.snap-scroll-x'))
    expect(before).toMatch(/@media\s*\(width\s*<\s*768px\)/)
    expect(mobileBlock).toMatch(/scroll-snap-type:\s*x\s+mandatory/)
    expect(mobileBlock).toMatch(/scroll-snap-align:\s*center/)
  })
})

describe('DD-639 — BoardPage opt-in Spalten-Snap (snapColumns-Prop)', () => {
  test('snapColumns=true legt snap-scroll-x auf den Scroll-Container', () => {
    const html = renderToStaticMarkup(
      createElement(BoardPage, { snapColumns: true, lanes: createElement('div', null, 'x') }),
    )
    expect(html).toContain('snap-scroll-x')
  })

  test('snapColumns default (false) lässt das Board unverändert (kein Desktop-Regress)', () => {
    const html = renderToStaticMarkup(
      createElement(BoardPage, { lanes: createElement('div', null, 'x') }),
    )
    expect(html).not.toContain('snap-scroll-x')
  })
})

describe('DD-639 — Roadmap-Consumer wendet das Primitive an', () => {
  test('RoadmapColumns: Spalten tragen snap-col (Einrast-Ziel)', () => {
    expect(read('src/components/ui/organisms/RoadmapColumns.jsx')).toContain('snap-col')
  })

  test('RoadmapBoard: opt-in via snapColumns + Completed-Swimlane (Swipe-up)', () => {
    const view = read('src/views/RoadmapBoard.jsx')
    // Anker werden via `${SCOPE}` (= 'roadmap-board') gebaut → Suffix-Guard.
    expect(view).toContain('snapColumns')
    expect(view).toContain('.column.snap') // modelliertes data_ui im Live-DOM (W103/ADR-0030)
    expect(view).toContain('.swimlane.completed')
    expect(view).toContain('.swimlane.completed.hint')
  })
})
