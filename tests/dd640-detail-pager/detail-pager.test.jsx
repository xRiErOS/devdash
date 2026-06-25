// DD-640 (F8) — Detail-Pager-Molecule + Live-Wiring-Guard. Wiederverwendbarer
// Vor/Zurück-Pager am unteren Detail-Ende (ItemDetail jetzt, Sprint-Review-Auto-
// Advance F9 später). project_memory 333: env=node, renderToStaticMarkup-Struktur-
// Smoke + reine Logik + Source-Guard — KEINE Event-Simulation (kein jsdom).
import { describe, test, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import DetailPager from '../../src/components/ui/molecules/DetailPager.jsx'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// Markup-Segment eines data-ui-Ankers bis zum nächsten Anker isolieren, um den
// disabled-Zustand eindeutig EINEM Button zuzuordnen (die Button-Klassen tragen
// `disabled:opacity-50` → nur das echte HTML-Attribut `disabled=""` zählt).
function buttonTag(markup, anchor) {
  const a = markup.indexOf(`data-ui="${anchor}"`)
  if (a < 0) return ''
  const start = markup.lastIndexOf('<button', a)
  const end = markup.indexOf('>', a)
  return markup.slice(start, end + 1)
}
const isDisabled = (markup, anchor) => / disabled=""/.test(buttonTag(markup, anchor))

describe('DD-640 DetailPager — Molecule-Struktur', () => {
  test('mittige Position: beide Buttons aktiv, Position "3 / 12", alle data-ui-Anker', () => {
    const m = renderToStaticMarkup(<DetailPager index={3} total={12} />)
    expect(m).toContain('data-ui="app-shell.pager"')
    expect(m).toContain('data-ui="app-shell.pager.prev"')
    expect(m).toContain('data-ui="app-shell.pager.position"')
    expect(m).toContain('data-ui="app-shell.pager.advance"')
    expect(m).toContain('3 / 12')
    expect(isDisabled(m, 'app-shell.pager.prev')).toBe(false)
    expect(isDisabled(m, 'app-shell.pager.advance')).toBe(false)
  })

  test('Listen-Anfang (1/12): prev deaktiviert, advance aktiv', () => {
    const m = renderToStaticMarkup(<DetailPager index={1} total={12} />)
    expect(isDisabled(m, 'app-shell.pager.prev')).toBe(true)
    expect(isDisabled(m, 'app-shell.pager.advance')).toBe(false)
  })

  test('Listen-Ende (12/12): advance deaktiviert, prev aktiv', () => {
    const m = renderToStaticMarkup(<DetailPager index={12} total={12} />)
    expect(isDisabled(m, 'app-shell.pager.prev')).toBe(false)
    expect(isDisabled(m, 'app-shell.pager.advance')).toBe(true)
  })

  test('Touch-Target ≥44px (Button size lg = h-11) + Safe-Area-Inset (pb-[34px])', () => {
    const m = renderToStaticMarkup(<DetailPager index={2} total={5} />)
    expect(m).toContain('h-11')
    expect(m).toContain('pb-[34px]')
  })

  test('kein Roh-Hex im gerenderten Markup (nur var(--token))', () => {
    const m = renderToStaticMarkup(<DetailPager index={2} total={5} />)
    expect(/[[(:]#[0-9a-fA-F]{3,8}\b/.test(m)).toBe(false)
  })
})

describe('DD-640 DetailPager — Source aus kanonischen Atomen', () => {
  const src = read('src/components/ui/molecules/DetailPager.jsx')
  test('reused das Button-Atom (size lg) statt roher button-Elemente', () => {
    expect(src).toContain("from '../atoms/Button.jsx'")
    expect(src).toContain('size="lg"')
  })
})

describe('DD-640 — Live-Wiring ItemDetail (Mobile-Detail-Ende)', () => {
  const src = read('src/views/ItemDetail.jsx')
  test('importiert die DetailPager-Molecule', () => {
    expect(src).toMatch(/import DetailPager from '.*molecules\/DetailPager\.jsx'/)
  })
  test('rendert den Pager (app-shell.pager-Anker erscheint über die Molecule)', () => {
    expect(src).toContain('<DetailPager')
  })
  test('liest die Geschwister-Liste aus dem Navigations-State (useLocation)', () => {
    expect(src).toContain('useLocation')
  })
})

describe('DD-640 — Herkunfts-Liste reicht Pager-Kontext durch (BacklogPage)', () => {
  const src = read('src/views/BacklogPage.jsx')
  test('öffnet Issues mit Pager-Geschwister-State', () => {
    expect(src).toContain('pagerSiblings')
  })
})
