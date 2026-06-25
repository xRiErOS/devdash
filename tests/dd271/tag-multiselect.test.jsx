import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..', '..')
// DD-589: legacy components/TagMultiSelect.jsx wurde nach _archive verschoben
// (Leaf-Cutover, State nach ItemDetail/Layout gehoben). Das ARIA-Combobox-Pattern
// lebt verlustfrei im kanonischen ui/-Molecule weiter — Audit zeigt dorthin.
const src = readFileSync(resolve(repoRoot, 'src/components/ui/molecules/TagMultiSelect.jsx'), 'utf8')

// DD-271 — Source-Audit fuer das ARIA-Combobox-Pattern (W3C).
// Der echte Keyboard-Flow (Pfeiltasten, Enter, Esc) wird im Playwright-Spec
// e2e/dd271/keyboard-nav.spec.js gegen das echte DOM verifiziert. Hier wird
// sichergestellt, dass die ARIA-Bausteine + State-Hooks im Quellcode liegen.

describe('DD-271 · TagMultiSelect ARIA-Combobox Source-Audit', () => {
  test('Input traegt role=combobox + aria-expanded + aria-controls + aria-activedescendant', () => {
    expect(src).toMatch(/role=["']combobox["']/)
    expect(src).toMatch(/aria-expanded=\{open\}/)
    expect(src).toMatch(/aria-controls=\{listboxId\}/)
    expect(src).toMatch(/aria-activedescendant=\{activeDescendant\}/)
    expect(src).toMatch(/aria-autocomplete=["']list["']/)
  })

  test('Listbox-Container ist <ul role=listbox> mit stabilen IDs', () => {
    expect(src).toMatch(/role=["']listbox["']/)
    expect(src).toMatch(/id=\{listboxId\}/)
    expect(src).toMatch(/useId\(\)/)
  })

  test('Optionen sind <li role=option> mit aria-selected', () => {
    expect(src).toMatch(/role=["']option["']/)
    expect(src).toMatch(/aria-selected=\{isActive\}/)
    expect(src).toMatch(/aria-selected=\{highlightedIndex === filtered\.length\}/)
  })

  test('onKeyDown verarbeitet ArrowDown, ArrowUp, Home, End, Enter, Escape', () => {
    expect(src).toMatch(/['"]ArrowDown['"]/)
    expect(src).toMatch(/['"]ArrowUp['"]/)
    expect(src).toMatch(/['"]Home['"]/)
    expect(src).toMatch(/['"]End['"]/)
    expect(src).toMatch(/['"]Enter['"]/)
    expect(src).toMatch(/['"]Escape['"]/)
  })

  test('Pfeiltasten-Wrap-Around via Modulo + clamp-Effect', () => {
    expect(src).toMatch(/\(i \+ 1\) % optionCount/)
    expect(src).toMatch(/\(i - 1 \+ optionCount\) % optionCount/)
    expect(src).toMatch(/highlightedIndex >= optionCount/)
  })

  test('Enter selektiert markierte Option (commitHighlighted)', () => {
    expect(src).toMatch(/commitHighlighted/)
    expect(src).toMatch(/if \(highlightedIndex < filtered\.length\)/)
  })

  test('Mouse-Hover synchronisiert Highlight (onMouseEnter)', () => {
    expect(src).toMatch(/onMouseEnter=\{\(\) => setHighlightedIndex\(/)
  })

  test('Esc ruft closeAndHandoff + stop-propagation', () => {
    expect(src).toMatch(/closeAndHandoff/)
    expect(src).toMatch(/e\.stopPropagation\(\)/)
  })

  test('Highlight wird beim Query-Change auf 0 zurueckgesetzt', () => {
    expect(src).toMatch(/setHighlightedIndex\(0\)[\s\S]{0,200}?\}, \[query\]\)/)
  })
})
