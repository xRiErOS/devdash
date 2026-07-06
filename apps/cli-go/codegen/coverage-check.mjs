#!/usr/bin/env node
/**
 * coverage-check.mjs — L1-Coverage-Beweis (DD2-212)
 *
 * Beweist unabhängig von der Codegen-Pipeline: jedes Tool aus capabilities.json ist entweder
 * (a) als Client-Func in generated.go generiert, (b) im Skip-Allowlist (skip-allowlist.json —
 * bereits hand-implementiert, Konsolidierung DD2#36) oder (c) explizit als agent-only gelistet
 * (agent-only-allowlist.json — bewusst nicht im Go-Client, z.B. reine AI-Memory-/Session-Tools
 * ohne TUI-Bezug). Set-Differenz muss leer sein — sonst ist eine Lücke maschinell rot statt nur
 * behauptet ("100% Coverage") zu sein.
 *
 * Parst generated.go direkt (Kommentar `// <GoName> entspricht MCP-Tool <name>.`, von
 * gen-client.mjs pro Func geschrieben) statt die Codegen-Skip-Logik erneut aufzurufen — das ist
 * eine von der Generator-internen Buchführung unabhängige zweite Prüfung.
 *
 *   node apps/cli-go/codegen/coverage-check.mjs
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_DIR = join(__dirname, '..', 'internal', 'api')
const CAPS_FILE = join(API_DIR, 'generated', 'capabilities.json')
const GENERATED_FILE = join(API_DIR, 'generated.go')
const SKIP_ALLOWLIST_FILE = join(__dirname, 'skip-allowlist.json')
const AGENT_ONLY_FILE = join(__dirname, 'agent-only-allowlist.json')

function names(file, key) {
  return new Set(JSON.parse(readFileSync(file, 'utf8')).map((e) => e[key]))
}

export function checkCoverage() {
  const caps = JSON.parse(readFileSync(CAPS_FILE, 'utf8'))
  const sollNames = new Set(Object.keys(caps.tools))

  const generatedSrc = readFileSync(GENERATED_FILE, 'utf8')
  const generatedNames = new Set([...generatedSrc.matchAll(/entspricht MCP-Tool (\S+)\./g)].map((m) => m[1]))

  const skipNames = names(SKIP_ALLOWLIST_FILE, 'tool')
  const agentOnlyNames = names(AGENT_ONLY_FILE, 'tool')

  const covered = new Set([...generatedNames, ...skipNames, ...agentOnlyNames])

  const missing = [...sollNames].filter((n) => !covered.has(n)).sort()
  const overlap = [...generatedNames].filter((n) => skipNames.has(n) || agentOnlyNames.has(n)).sort()
  const stale = [...covered].filter((n) => !sollNames.has(n)).sort()

  return {
    sollCount: sollNames.size,
    generatedCount: generatedNames.size,
    skipCount: skipNames.size,
    agentOnlyCount: agentOnlyNames.size,
    missing,
    overlap,
    stale,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = checkCoverage()
  let failed = false
  if (r.missing.length) {
    failed = true
    console.error(`GAP: ${r.missing.length} Tool(s) weder generiert noch allowlisted:`)
    for (const n of r.missing) console.error(`  ${n}`)
  }
  if (r.overlap.length) {
    failed = true
    console.error(`OVERLAP: ${r.overlap.length} Tool(s) generiert UND allowlisted (Widerspruch):`)
    for (const n of r.overlap) console.error(`  ${n}`)
  }
  if (r.stale.length) {
    failed = true
    console.error(`STALE: ${r.stale.length} Allowlist-Eintrag ohne zugehöriges MCP-Tool:`)
    for (const n of r.stale) console.error(`  ${n}`)
  }
  if (failed) process.exit(1)
  console.log(
    `OK: L1-Coverage 100% — ${r.sollCount} Tools (${r.generatedCount} generiert, ${r.skipCount} allowlisted, ${r.agentOnlyCount} agent-only).`
  )
}
