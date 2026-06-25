// DD-559: checkJs + JSDoc inkrementell aktivieren — CI-Typprüfung ohne .ts-Rename.
// tsconfig: checkJs GLOBAL AUS, opt-in pro Datei via `// @ts-check`. Seed = contracts/.
// Dieser Test pinnt das Setup (tsconfig-Flags, @ts-check-Abdeckung der Contracts, Script,
// CI-Step), damit die inkrementelle Typprüfung nicht still verschwindet.

import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

describe('DD-559 — tsconfig (inkrementelle checkJs)', () => {
  const ts = JSON.parse(readFileSync('tsconfig.json', 'utf8'))
  test('allowJs an, checkJs AUS (per-Datei opt-in), noEmit', () => {
    expect(ts.compilerOptions.allowJs).toBe(true)
    expect(ts.compilerOptions.checkJs).toBe(false)
    expect(ts.compilerOptions.noEmit).toBe(true)
  })
  test('src/ ist ausgenommen (Frontend deprioritisiert, D01)', () => {
    expect(ts.exclude).toContain('src')
  })
})

describe('DD-559 — @ts-check-Seed', () => {
  const files = readdirSync('contracts').filter(f => f.endsWith('.js'))
  test('alle contracts/*.js tragen `// @ts-check`', () => {
    const missing = files.filter(f => !readFileSync(`contracts/${f}`, 'utf8').startsWith('// @ts-check'))
    expect(missing).toEqual([])
  })
})

describe('DD-559 — Wiring', () => {
  test('package.json hat ein typecheck-Script (tsc --noEmit)', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.scripts.typecheck).toMatch(/tsc --noEmit/)
  })
  test('CI ruft den Typecheck-Step', () => {
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toMatch(/npm run typecheck/)
  })
})
