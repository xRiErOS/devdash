// DD-310 — SprintFormModal: Milestone-Picker mit searchable={true}
//
// Test-Strategie:
//   Vitest läuft im node-Environment (kein jsdom). Daher:
//   (a) Source-Inspection: SprintFormModal.jsx übergibt searchable an Select.
//       (DD-452: SprintCreateModal+SprintEditModal zu SprintFormModal dedupliziert.)
//   (b) Logik-Inspection: Select.jsx filtert anhand des query bei aktiviertem search.
//   Volle Klick-/Keyboard-Interaktion = Playwright (out of scope).
import { describe, test, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
// DD-588: SprintFormModal nach Cutover auf kanonischen Organism-Pfad umgestellt.
const MODAL_PATH = path.join(REPO_ROOT, 'src', 'components', 'ui', 'organisms', 'SprintFormModal.jsx')
const SELECT_PATH = path.join(REPO_ROOT, 'src', 'components', 'ui', 'molecules', 'Select.jsx')

const modalSrc = fs.readFileSync(MODAL_PATH, 'utf-8')
const selectSrc = fs.readFileSync(SELECT_PATH, 'utf-8')

describe('DD-310 · SprintFormModal — Milestone-Select hat searchable={true}', () => {
  test('Select-Aufruf im Modal hat searchable-Prop', () => {
    // Suche den <Select ...> Block für Milestone (ariaLabel="Milestone").
    const milestoneSelectBlock = modalSrc.match(/<Select[\s\S]*?ariaLabel="Milestone"[\s\S]*?\/>/)
    expect(milestoneSelectBlock, 'Select für Milestone existiert im Modal').toBeTruthy()
    expect(milestoneSelectBlock[0]).toMatch(/\bsearchable\b/)
  })

  test('Select-Aufruf nutzt placeholder "— Kein Milestone —"', () => {
    expect(modalSrc).toContain('placeholder="— Kein Milestone —"')
  })

  test('options-Array enthält Empty-Option + milestones-Mapping', () => {
    expect(modalSrc).toContain("value: '', label: '— Kein Milestone —'")
    // DD-588: kanonischer Organism baut milestoneOptions via .filter+.map (statt inline milestones.map)
    expect(modalSrc).toMatch(/milestones[\s\S]{0,60}\.map\(\(m\) => \(\{\s*value: String\(m\.id\), label: m\.name/)
  })
})

describe('DD-310 · Select.jsx — searchable Verhalten', () => {
  test('searchable explizit übersteuert default-threshold (>=8)', () => {
    // Code-Inspection: const useSearch = searchable ?? options.length >= 8
    expect(selectSrc).toMatch(/const useSearch = searchable \?\? options\.length >= 8/)
  })

  test('Search-Input render-Bedingung: {useSearch && ...}', () => {
    expect(selectSrc).toMatch(/\{useSearch && \(/)
  })

  test('Keyboard-Navigation: ArrowDown/ArrowUp setzen activeIdx', () => {
    expect(selectSrc).toMatch(/e\.key === 'ArrowDown'.*setActiveIdx/s)
    expect(selectSrc).toMatch(/e\.key === 'ArrowUp'.*setActiveIdx/s)
  })

  test("Enter ruft onChange?.(opt.value)", () => {
    expect(selectSrc).toMatch(/e\.key === 'Enter'[\s\S]{0,200}onChange\?\.\(opt\.value\)/)
  })

  test('Escape schließt Dropdown (setOpen(false))', () => {
    expect(selectSrc).toMatch(/e\.key === 'Escape'[\s\S]{0,80}setOpen\(false\)/)
  })

  test('Filtered-Logic: useMemo filtert anhand query.toLowerCase()', () => {
    expect(selectSrc).toMatch(/const q = query\.toLowerCase\(\)/)
    expect(selectSrc).toMatch(/options\.filter\(o => String\(o\.label\)\.toLowerCase\(\)\.includes\(q\)/)
  })

  test('Scroll-Container: token-basierte max-Höhe für Optionen-Liste (verhindert Modal-Überlauf)', () => {
    // DD-45 R12: Modal-Begrenzung — Container max-h-56 (~224px), innere Optionen-Liste max-h-44 (~176px).
    // FE-Rework Plan 02 T6 (I05): rohe px-Literale durch Tailwind-Sizing-Klassen ersetzt.
    // Werte bewusst begrenzt, damit der Picker in schmalen Modals nicht über den Viewport hinausragt.
    expect(selectSrc).toMatch(/className="overflow-y-auto max-h-44"/)
  })
})
