// Frontend-MDX-Link-Check — hält die MDX-Knowledge-Base sauber zugeordnet (I03).
//
// MDX ist die einzige Narrativ-Wahrheit je Komponente (docs/doc-mdx-Norm.md). Damit
// stale Doku nicht still mitläuft, prüft dieser statische Check JEDE .mdx:
//   1. kein toter Helfer-Import (Status.jsx/Composition.jsx existieren nach Clean-Cut nicht).
//   2. component-bound .mdx (importiert eine *.stories.*) → Sibling-Story existiert.
//   3. jeder `of={Alias.Story}`-Verweis löst auf einen echten Story-Export auf.
// Tier-Landing-MDX (Atoms.mdx etc., kein Stories-Import) sind ausgenommen von 2/3.
//
// SOFT (gelistet, kein Fail): .stories.* ohne Sibling-.mdx. Story-↔-MDX-Vollständigkeit
// wird erst NACH dem PO-Review-Slim scharf — jetzt nur Sichtbarkeit, nicht gegen Ist-Drift kämpfen.

import { describe, test, expect } from 'vitest'

const mdxRaw = import.meta.glob('../../apps/frontend/src/storybook/**/*.mdx', { query: '?raw', import: 'default', eager: true })
const storyRaw = import.meta.glob('../../apps/frontend/src/storybook/**/*.stories.{js,jsx}', { query: '?raw', import: 'default', eager: true })

// Auf src/storybook/-Suffix normalisieren (robust gegen relative Glob-Keys).
const suffix = (p) => p.slice(p.indexOf('src/storybook/'))
const mdxBy = Object.fromEntries(Object.entries(mdxRaw).map(([p, r]) => [suffix(p), r]))
const storyBy = Object.fromEntries(Object.entries(storyRaw).map(([p, r]) => [suffix(p), r]))

const dirOf = (s) => s.slice(0, s.lastIndexOf('/'))
const exportsOf = (raw) => {
  const out = new Set()
  for (const m of raw.matchAll(/export\s+const\s+(\w+)/g)) out.add(m[1])
  return out
}

describe('Frontend-MDX-Link — saubere Zuordnung', () => {
  test('MDX gefunden (Glob nicht leergelaufen)', () => {
    expect(Object.keys(mdxBy).length).toBeGreaterThan(0)
  })

  for (const [mdxSuffix, raw] of Object.entries(mdxBy)) {
    describe(mdxSuffix, () => {
      test('kein toter Helfer-Import (Status.jsx/Composition.jsx)', () => {
        const dead = raw.match(/from\s+['"][^'"]*\.storybook\/(?:Status|Composition)\.jsx['"]/)
        expect(dead, `toter Helfer-Import in ${mdxSuffix}: ${dead?.[0]}`).toBeNull()
      })

      const imp = raw.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](\.[^'"]+\.stories\.\w+)['"]/)
      if (!imp) return // Tier-Landing-MDX — keine Story-Bindung.

      const [, alias, relPath] = imp
      const siblingSuffix = `${dirOf(mdxSuffix)}/${relPath.replace(/^\.\//, '')}`

      test(`Sibling-Story existiert (${relPath})`, () => {
        expect(storyBy[siblingSuffix], `${mdxSuffix} importiert ${relPath} — nicht gefunden`).toBeDefined()
      })

      const storySrc = storyBy[siblingSuffix]
      if (!storySrc) return
      const exps = exportsOf(storySrc)
      const refs = [...raw.matchAll(new RegExp(`of=\\{${alias}\\.(\\w+)\\}`, 'g'))].map((m) => m[1])

      for (const ref of refs) {
        test(`of={${alias}.${ref}} löst auf einen Story-Export auf`, () => {
          expect(exps.has(ref), `${mdxSuffix}: of={${alias}.${ref}} — kein export const ${ref} in ${relPath}`).toBe(true)
        })
      }
    })
  }

  // SOFT — Stories ohne Sibling-MDX listen (kein Fail bis PO-Slim, D03-Sequenz).
  test('Coverage-Report: Stories ohne Sibling-MDX (soft)', () => {
    const missing = Object.keys(storyBy)
      .filter((s) => !mdxBy[s.replace(/\.stories\.\w+$/, '.mdx')])
      .sort()
    if (missing.length) {
      console.warn(`\n[MDX-Coverage] ${missing.length} Stories ohne .mdx (nach PO-Slim nachziehen):\n  ` + missing.join('\n  '))
    }
    expect(Array.isArray(missing)).toBe(true)
  })
})
