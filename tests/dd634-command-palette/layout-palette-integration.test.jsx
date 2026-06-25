// DD-634 (F2) — Layout-Integration: Command-Palette ist die EINZIGE Such-/Sprung-
// Surface (D02). Source-Guard (env=node, kein jsdom) auf das echte Layout:
//  - Layout mountet die Palette (Container, der CommandPalette rendert) + hält
//    paletteOpen-State.
//  - ⌘K (mod+k), f und der palette-Bottom-Tab öffnen die Palette; Escape schließt.
//  - Die Inline-Header-Suche (DD-533, hidden sm:block GlobalSearchContainer im
//    PageHeader) ist entfernt — kein page-header.search-Anker, kein
//    GlobalSearchContainer mehr.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const src = () => readFileSync(join(ROOT, 'src/components/ui/layout/Layout.jsx'), 'utf8')

describe('DD-634 Layout — Command-Palette verdrahtet', () => {
  test('importiert + rendert CommandPalette', () => {
    const s = src()
    expect(s).toMatch(/import\s+CommandPalette\s+from\s+['"][^'"]*organisms\/CommandPalette\.jsx['"]/)
    expect(s).toMatch(/<CommandPalette/)
  })

  test('hält paletteOpen-State (useState)', () => {
    expect(src()).toMatch(/\[paletteOpen,\s*setPaletteOpen\]\s*=\s*useState/)
  })

  test('⌘K (mod+k) öffnet die Palette', () => {
    expect(src()).toMatch(/'mod\+k':\s*\(\)\s*=>\s*setPaletteOpen\(true\)/)
  })

  test('f öffnet die Palette (löst focusGlobalSearch ab)', () => {
    expect(src()).toMatch(/\bf:\s*\(\)\s*=>\s*setPaletteOpen\(true\)/)
  })

  test('palette-Bottom-Tab öffnet die Palette (ersetzt Quick-Switcher-Interim)', () => {
    expect(src()).toMatch(/case 'palette':[\s\S]*?setPaletteOpen\(true\)/)
  })

  test('Escape schließt die Palette', () => {
    expect(src()).toMatch(/setPaletteOpen\(false\)/)
  })
})

describe('DD-634 Layout — DD-533-GlobalSearchContainer bleibt abgelöst', () => {
  // DD-634 löste die DD-533-GlobalSearchContainer-Inline-Suche (eigener Such-
  // Service/Dropdown) durch die Command-Palette ab. DD-670 führt eine SEPARATE,
  // schlanke View-Suche (?search=-URL-Sync) im Page-Header ein — das ist NICHT
  // der GlobalSearchContainer. Die Palette (⌘K) bleibt die globale Sprung-Surface.
  test('kein GlobalSearchContainer mehr im Header', () => {
    expect(src()).not.toMatch(/<GlobalSearchContainer/)
  })

  test('kein DD-533 hidden sm:block w-64 Such-Wrapper mehr', () => {
    expect(src()).not.toMatch(/hidden sm:block w-64/)
  })

  test('DD-670: View-Suche lebt jetzt im Page-Header (eigener Anker, nicht GlobalSearch)', () => {
    expect(src()).toContain('app-shell.page-header.search')
  })

  test('Command-Palette (⌘K) bleibt die globale Such-/Sprung-Surface', () => {
    expect(src()).toMatch(/'mod\+k':\s*\(\)\s*=>\s*setPaletteOpen\(true\)/)
  })
})
