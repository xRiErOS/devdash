// DD-598 / DD-637 — F5 Safe-Area-Foundation (Code-Cutover der Storybook-as-Plan-SOLL).
//
// SOLL-Vertrag (project_memory #321/#322, story id 1481 DD-637):
//   - viewport-fit=cover (index.html, schon da DD-229) füllt env(safe-area-inset-*).
//   - EINE Quelle: env()-Utilities in src/index.css (T01) statt verstreuter
//     pb-[env(...)]-Arbitraries.
//   - Bottom-fixierte interaktive Elemente respektieren den unteren Inset und
//     kollidieren auf iPhone 14 Pro (34px Home-Indicator-Zone) nicht mehr.
//
// Behaviorales env()-Rendering ist Browser-only → Playwright-Gate DD-603.
// Hier: React-/Source-Ebene — opt-in-Klassen + Single-Source-Util.

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import StickyActionBar from '../../src/components/ui/atoms/StickyActionBar.jsx'
import BulkBar from '../../src/components/ui/organisms/BulkBar.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

describe('DD-598 F5 — index.css ist Single-Source der env(safe-area)-Utils', () => {
  const css = read('src/index.css')

  test('definiert @utility pb-safe (container-padding)', () => {
    expect(css).toMatch(/@utility\s+pb-safe\s*\{/)
  })

  test('definiert @utility pb-safe-bar (bar-padding mit floor)', () => {
    expect(css).toMatch(/@utility\s+pb-safe-bar\s*\{/)
  })

  test('definiert @utility bottom-safe (fixed-offset über der Inset-Zone)', () => {
    expect(css).toMatch(/@utility\s+bottom-safe\s*\{/)
  })

  test('die Utils lesen env(safe-area-inset-bottom)', () => {
    expect(css).toMatch(/env\(safe-area-inset-bottom\)/)
  })
})

describe('DD-598 F5 — bottom-fixierte Elemente respektieren den Inset', () => {
  test('StickyActionBar trägt pb-safe-bar (Buttons über der Home-Indicator-Zone)', () => {
    const html = renderToStaticMarkup(
      <StickyActionBar>
        <button>Speichern</button>
      </StickyActionBar>,
    )
    expect(html).toContain('data-ui="sticky-action-bar"')
    expect(html).toContain('pb-safe-bar')
  })

  test('StickyActionBar nutzt nicht mehr das symmetrische py-3 (würde Inset-Padding überschreiben)', () => {
    const src = read('src/components/ui/atoms/StickyActionBar.jsx')
    expect(src).not.toMatch(/\bpy-3\b/)
  })

  test('BulkBar hebt sich per bottom-safe statt bottom-4 über die Inset-Zone', () => {
    const html = renderToStaticMarkup(<BulkBar selectedCount={3} />)
    expect(html).toContain('bottom-safe')
    expect(html).not.toContain('bottom-4')
  })
})

describe('DD-598 F5 — Single-Source-Migration bestehender Arbitraries', () => {
  test('CaptureView nutzt pb-safe statt rohem pb-[env(safe-area-inset-bottom)]', () => {
    const src = read('src/views/CaptureView.jsx')
    expect(src).toContain('pb-safe')
    expect(src).not.toContain('pb-[env(safe-area-inset-bottom)]')
  })
})
