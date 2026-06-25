import { test, expect, describe } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import SlotToc from '../../src/components/ui/molecules/SlotToc.jsx'
import SlotFullTextWindow from '../../src/components/ui/organisms/SlotFullTextWindow.jsx'

// DD-599 (M5c) — Slot-Navigation auf den echten Surfaces (SSTD-Slot + SOP).
// env=node: die Komponenten-Verträge via renderToStaticMarkup, die Surface-
// Verdrahtung (Scroll/Clip/Fenster, browser-runtime) als Source-Guard.

const ROOT = process.cwd()
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

describe('SlotToc (D02)', () => {
  const entries = [
    { key: 'architecture', title: 'Architektur' },
    { key: 'journal', title: 'Journal', readonly: true },
  ]
  const out = renderToStaticMarkup(<SlotToc entries={entries} label="SSTD — Slots" tocId="sstd-slot-toc" />)

  test('TOC-Wurzel trägt id + data-ui', () => {
    expect(out).toContain('id="sstd-slot-toc"')
    expect(out).toContain('data-ui="detail.slot-nav.toc"')
  })

  test('je Eintrag ein Sprung-Button mit data-ui', () => {
    expect(out).toContain('data-ui="detail.slot-nav.toc.item.architecture"')
    expect(out).toContain('data-ui="detail.slot-nav.toc.item.journal"')
  })

  test('Touch-Target ≥44px', () => {
    expect(out).toContain('min-h-[44px]')
  })
})

describe('SlotFullTextWindow (D04)', () => {
  test('geschlossen → kein Markup', () => {
    expect(renderToStaticMarkup(<SlotFullTextWindow open={false} title="X" body="Y" />)).toBe('')
  })

  test('read-Modus: Zurück + Bearbeiten-Trigger, kein Save', () => {
    const out = renderToStaticMarkup(<SlotFullTextWindow open title="Architektur" body="Inhalt" mode="read" />)
    expect(out).toContain('data-ui="detail.slot-nav.window"')
    expect(out).toContain('data-ui="detail.slot-nav.window.back"')
    expect(out).toContain('data-ui="detail.slot-nav.window.edit-trigger"')
    expect(out).not.toContain('detail.slot-nav.window.save')
  })

  test('edit-Modus: Textfeld + Speichern + Abbrechen', () => {
    const out = renderToStaticMarkup(<SlotFullTextWindow open title="SOP" body="Inhalt" mode="edit" />)
    expect(out).toContain('data-ui="detail.slot-nav.window.field"')
    expect(out).toContain('data-ui="detail.slot-nav.window.save"')
    expect(out).toContain('data-ui="detail.slot-nav.window.cancel"')
    expect(out).not.toContain('window.edit-trigger')
  })

  test('readonly-Modus: Lock-Badge, kein Edit-Trigger/Save', () => {
    const out = renderToStaticMarkup(<SlotFullTextWindow open title="Journal" body="Inhalt" mode="readonly" />)
    expect(out).toContain('read-only')
    expect(out).not.toContain('window.edit-trigger')
    expect(out).not.toContain('window.save')
  })
})

describe('Clip-Vertrag (D03) — mobil 40vh + Fade', () => {
  test('SlotSection trägt die mobil-gegatete Clip-Variante', () => {
    const src = read('src/components/ui/organisms/SlotSection.jsx')
    expect(src).toMatch(/max-md:max-h-\[40vh\]/)
    expect(src).toContain('clip')
    expect(src).toContain('onExpand')
  })

  test('SopSlot trägt die mobil-gegatete Clip-Variante', () => {
    const src = read('src/components/ui/organisms/SopSlot.jsx')
    expect(src).toMatch(/max-md:max-h-\[40vh\]/)
    expect(src).toContain('onBackToNav')
  })
})

describe('Surface-Verdrahtung (Source-Guard)', () => {
  test('SstdTab: TOC + ↑-Anker + Volltext-Fenster verdrahtet', () => {
    const src = read('src/components/ui/organisms/SstdTab.jsx')
    expect(src).toContain('SlotToc')
    expect(src).toContain('SlotFullTextWindow')
    expect(src).toContain('detail.slot-nav.slot.${key}.back-to-nav')
    expect(src).toContain('scrollToId')
    expect(src).toContain('useMediaQuery')
  })

  test('GlobalSettings: TOC + Volltext-Fenster auf der SOP-Seite verdrahtet', () => {
    const src = read('src/views/GlobalSettings.jsx')
    expect(src).toContain('SlotToc')
    expect(src).toContain('SlotFullTextWindow')
    expect(src).toContain('sopDomId')
    expect(src).toContain('useMediaQuery')
  })
})
