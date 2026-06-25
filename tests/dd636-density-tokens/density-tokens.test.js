// DD-636 (F4) — Responsive Density-Tokens. Source-Guard (project_memory 333:
// env=node, kein CSS-Compute → strukturelle Prüfung, NICHT das Pixel-Resultat;
// die visuelle Verifikation ist per project_memory F4-DENSITY (PO-Entscheid) bewusst
// dem PO/Storybook überlassen).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const css = read('src/index.css')

// Den Mobile-Override-Block isolieren.
function mobileBlock() {
  const i = css.indexOf('@media (width < 768px)')
  if (i < 0) return ''
  const open = css.indexOf('{', i)
  // bis zum schließenden } des :root + } des @media (2 Ebenen)
  return css.slice(i, css.indexOf('}', css.indexOf('}', open) + 1) + 1)
}

describe('DD-636 Density-Tokens — index.css', () => {
  test('Basis-Skala (Desktop) im :root unverändert: --space-1..6 = 4/8/12/16/20/24', () => {
    expect(css).toMatch(/--space-1:\s*4px/)
    expect(css).toMatch(/--space-2:\s*8px/)
    expect(css).toMatch(/--space-3:\s*12px/)
    expect(css).toMatch(/--space-4:\s*16px/)
    expect(css).toMatch(/--space-5:\s*20px/)
    expect(css).toMatch(/--space-6:\s*24px/)
  })

  test('Mobile-Media-Query (<768px) überschreibt --space-1..6 radikal', () => {
    const block = mobileBlock()
    expect(block).toContain(':root')
    expect(block).toMatch(/--space-1:\s*2px/)
    expect(block).toMatch(/--space-2:\s*4px/)
    expect(block).toMatch(/--space-3:\s*6px/)
    expect(block).toMatch(/--space-4:\s*8px/)
    expect(block).toMatch(/--space-5:\s*12px/)
    expect(block).toMatch(/--space-6:\s*14px/)
  })

  test('Touch-Target-Schutz: Mobile-Block fasst Tailwinds --spacing-Multiplikator NICHT an', () => {
    const block = mobileBlock()
    // nur --space-N, KEIN bare `--spacing:` (das würde h-11/w-11/px-* schrumpfen)
    expect(/--spacing\s*:/.test(block)).toBe(false)
  })
})

describe('DD-636 Density-Tokens — Layout-Primitive lesen --space-*', () => {
  test('gap.js routet xs/sm/md/lg über var(--space-1/2/4/6)', () => {
    const gap = read('src/components/ui/layout/gap.js')
    expect(gap).toContain('gap-[var(--space-1)]')
    expect(gap).toContain('gap-[var(--space-2)]')
    expect(gap).toContain('gap-[var(--space-4)]')
    expect(gap).toContain('gap-[var(--space-6)]')
  })

  test('Card-Padding sm/md über var(--space-2/4)', () => {
    const card = read('src/components/ui/atoms/Card.jsx')
    expect(card).toContain('p-[var(--space-2)]')
    expect(card).toContain('p-[var(--space-4)]')
  })
})
