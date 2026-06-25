// DD-594 (F3) — Mobile: EntryLists öffnen dedizierte Detailseiten statt
// Master-Detail. Quelle-übergreifender Conditional-Mount (useMediaQuery
// '(min-width: 1024px)', true) für die noch zweispaltig kollabierenden Views:
// MilestoneDetail (Core-Screen) + MemoryView/ProjectMemoryView (über die beiden
// Memory-Organismen).
//
// Source-Guard (env=node — Conditional-Mount + Touch-Laufzeit nicht headless
// testbar; visuelle/Touch-Abnahme = PO, DD-186). Belegt: Default true (Two-Pane
// für SSR/Snapshot-Stabilität), Single-Column-Branch <1024 und Back-Anker ≥44px.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const canonical = read('src/components/ui/organisms/MemoryMasterDetail.jsx')
const legacy = read('src/components/memory/MemoryMasterDetail.jsx')
const memoryView = read('src/views/MemoryView.jsx')
const milestone = read('src/views/MilestoneDetail.jsx')

const MEDIA = "'(min-width: 1024px)', true"

describe('DD-594 — kanonisches MemoryMasterDetail (MemoryView)', () => {
  test('Conditional-Mount via useMediaQuery, Default true (Two-Pane für Snapshot)', () => {
    expect(canonical).toContain('useMediaQuery')
    expect(canonical).toContain(MEDIA)
    expect(canonical).toContain('isDesktop')
  })

  test('Single-Column <1024: Detail wenn selektiert, sonst Liste — nie beide', () => {
    expect(canonical).toMatch(/isDesktop\s*\?[\s\S]*?listPanel[\s\S]*?detailPanel/)
    expect(canonical).toMatch(/showDetail\s*\?\s*detailPanel\s*:\s*listPanel/)
  })

  test('Mobile-Back-Arrow (≥44px) → onBack', () => {
    expect(canonical).toContain('.detail.back')
    expect(canonical).toContain('onBack')
    expect(canonical).toContain('w-11 h-11')
  })
})

describe('DD-594 — MemoryView verdrahtet onBack (Selektion leeren)', () => {
  test('handleBack setzt selectedId/selected null + isNew false', () => {
    expect(memoryView).toContain('handleBack')
    expect(memoryView).toContain('onBack={handleBack}')
  })
})

describe('DD-594 — legacy MemoryMasterDetail (ProjectMemoryView)', () => {
  test('Conditional-Mount via useMediaQuery, Default true', () => {
    expect(legacy).toContain('useMediaQuery')
    expect(legacy).toContain(MEDIA)
    expect(legacy).toContain('isDesktop')
  })

  test('Single-Column <1024: showDetail → Detail+Back, sonst Liste', () => {
    expect(legacy).toMatch(/isDesktop\s*\?[\s\S]*?showDetail\s*\?/)
    expect(legacy).toContain('handleBack')
    expect(legacy).toContain('.detail.back')
    expect(legacy).toContain('w-11 h-11')
  })
})

describe('DD-594 — MilestoneDetail Core-Screen (View-Level Conditional-Mount)', () => {
  test('Conditional-Mount via useMediaQuery, Default true', () => {
    expect(milestone).toContain('useMediaQuery')
    expect(milestone).toContain(MEDIA)
    expect(milestone).toContain('isDesktopDetail')
  })

  test('≥1024 MasterDetail, <1024 Vollbild-Stack mit Back-Arrow + Meta-last', () => {
    expect(milestone).toMatch(/isDesktopDetail\s*\?\s*\([\s\S]*?MasterDetail/)
    expect(milestone).toContain('milestone-detail.mobile.back')
    expect(milestone).toContain('w-11 h-11')
    // Stack-Reihenfolge: Stammdaten (paneHeader) → Pane → Meta-last (sidebar)
    expect(milestone).toMatch(/paneHeaderSlot[\s\S]*?paneSlot[\s\S]*?sidebarSlot/)
  })
})
