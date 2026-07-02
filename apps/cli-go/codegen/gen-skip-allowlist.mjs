#!/usr/bin/env node
/**
 * gen-skip-allowlist.mjs — maschinenlesbare Skip-/Allowlist-Emitter (DD2-209)
 *
 * Persistiert den aktuellen Skip-Katalog von gen-client.mjs (Tools, die der Single-Call-
 * Generator NICHT emittiert — echte Multi-Call-Tools, Zero-apiRequest-Komposition, vom
 * DD2-203-Parser nicht lesbare Handler-Formen, Namenskollision mit bereits hand-
 * implementiertem Code) als geprüftes JSON — Input fürs Freshness-/Coverage-Gate (DD2#37):
 * total_tools - generated_count - allowlist.length MUSS 0 sein, sonst ist ein Tool weder
 * generiert noch dokumentiert übersprungen ("silent gap").
 *
 * Generiert — nicht händisch editieren (Context-Model-Invariante, s. Root-CLAUDE.md).
 *
 *   node apps/cli-go/codegen/gen-skip-allowlist.mjs           # neu schreiben
 *   node apps/cli-go/codegen/gen-skip-allowlist.mjs --check   # nur prüfen (CI), exit 1 bei Diff
 */
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { introspect } from './introspect.mjs'
import { generate, existingClientMethodNames } from './gen-client.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = join(__dirname, 'skip-allowlist.json')

/** Grob-Kategorie aus dem Skip-Grund — für Menschen beim Lesen, nicht für die Gate-Logik. */
function categorize(reason) {
  if (/bereits hand-implementiert/.test(reason)) return 'already-implemented'
  if (/^apiRequest call count = 0$/.test(reason)) return 'zero-call'
  if (/^apiRequest call count/.test(reason)) return 'multi-call'
  return 'parser-limitation'
}

export async function buildAllowlist() {
  const tools = await introspect()
  const { skipped } = generate(tools, existingClientMethodNames())
  return skipped
    .map((s) => ({ tool: s.name, category: categorize(s.reason), reason: s.reason }))
    .sort((a, b) => a.tool.localeCompare(b.tool))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const allowlist = await buildAllowlist()
  const json = JSON.stringify(allowlist, null, 2) + '\n'
  if (process.argv.includes('--check')) {
    const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : null
    if (current !== json) {
      console.error(`DRIFT: ${OUT_FILE} ist veraltet — node apps/cli-go/codegen/gen-skip-allowlist.mjs neu laufen lassen.`)
      process.exit(1)
    }
    console.log(`OK: Allowlist aktuell (${allowlist.length} Tools).`)
  } else {
    writeFileSync(OUT_FILE, json)
    console.log(`OK: ${allowlist.length} Tools → ${OUT_FILE}`)
  }
}
