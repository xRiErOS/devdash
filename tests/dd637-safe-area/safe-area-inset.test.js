// DD-637 (F5) — Safe-Area-Foundation Vollständigkeit (DD-598). Die Foundation
// (viewport-fit=cover in index.html + @utility pb-safe/pb-safe-bar/bottom-safe in
// index.css) existiert; F1 Bottom-Tab/FAB nutzen sie bereits. Dieser Guard nagelt
// fest, dass ALLE bottom-fixierten interaktiven Flächen den Inset respektieren —
// kein Aktionselement kollidiert mit dem iOS-Home-Indicator. Source-Guard
// (project_memory 333: env=node, kein echtes Browser-Layout).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// Inset-Marker: eine der drei kanonischen Utils ODER eine explizite env()-Arbitrary.
const INSET = /pb-safe\b|pb-safe-bar\b|bottom-safe\b|env\(safe-area-inset/

// Jede bottom-fixierte interaktive Fläche MUSS den Safe-Area-Inset respektieren.
const SURFACES = [
  'src/components/ui/atoms/StickyActionBar.jsx',
  'src/components/ui/organisms/BottomTabBar.jsx',
  'src/components/ui/organisms/FabRadial.jsx',
  'src/components/ui/organisms/BulkBar.jsx',
  'src/components/ui/organisms/QuickMetaSheet.jsx',
  'src/components/ui/organisms/DetailEditScreen.jsx',
  'src/components/ui/organisms/ProjectHomeTabs.jsx',
  'src/components/ui/organisms/ProjectMetadataCard.jsx',
]

describe('DD-637 Safe-Area-Inset — Foundation', () => {
  test('viewport-fit=cover ist in index.html gesetzt', () => {
    expect(read('index.html')).toContain('viewport-fit=cover')
  })

  test('index.css trägt die kanonischen Safe-Area-Utils (Single-Source)', () => {
    const css = read('src/index.css')
    expect(css).toContain('@utility pb-safe')
    expect(css).toContain('@utility pb-safe-bar')
    expect(css).toContain('@utility bottom-safe')
  })

  for (const f of SURFACES) {
    test(`bottom-fixierte interaktive Fläche respektiert den Inset: ${f}`, () => {
      expect(INSET.test(read(f)), `${f}: kein Safe-Area-Inset (pb-safe/pb-safe-bar/bottom-safe/env(safe-area-inset))`).toBe(true)
    })
  }
})

describe('DD-637 — DetailEditScreen nutzt das kanonische StickyActionBar-Atom', () => {
  test('DetailEditScreen importiert StickyActionBar statt einer hand-gerollten Bar', () => {
    expect(read('src/components/ui/organisms/DetailEditScreen.jsx')).toMatch(/import\s+StickyActionBar\s+from/)
  })
})
