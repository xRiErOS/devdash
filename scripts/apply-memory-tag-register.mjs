#!/usr/bin/env node
// @index
// title: apply-memory-tag-register
// desc: Wendet Seed/Merge/Prune auf das memory_tags-Register via NAS-REST-API an (--yes = real, MEM-25)
// @end
// MEM-25 (T08): wendet das PO-freigegebene Seed + Merge + Prune auf das memory_tags-Register
// an — gegen die NAS-REST-API (DEVD_API_URL). AKTIVIERT den Hard-Block (D07).
//
// VORAUSSETZUNG: Migration 057 ist auf der Ziel-Instanz deployed (sonst 400
// TAG_REGISTER_UNAVAILABLE). KI deployt NIE — Mig-Deploy ist PO/Portainer.
//
// Default = DRY-RUN (nur Plan ausgeben). Mit `--yes` wird real geschrieben.
//   node scripts/apply-memory-tag-register.mjs            # Dry-Run
//   node scripts/apply-memory-tag-register.mjs --yes      # ausführen
//   DEVD_API_URL=http://localhost:5556 node … --yes       # gegen lokale Instanz
//
// Idempotent: bestehende Tags (409 TAG_DUPLICATE) werden übersprungen; Prune ist wiederholbar.

import { CANONICAL, MERGES } from './memory-tag-register.data.mjs'

const API = process.env.DEVD_API_URL || 'http://100.71.39.53:3001'
const PROJECT_ID = process.env.DEVD_PROJECT_ID || '2'
const DRY = !process.argv.includes('--yes')

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Project-Id': String(PROJECT_ID) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  return { status: res.status, json }
}

async function main() {
  console.log(`\nMEM-25 Apply — ${DRY ? 'DRY-RUN (nichts wird geschrieben)' : 'LIVE'}  → ${API}  project ${PROJECT_ID}`)
  console.log(`Plan: ${CANONICAL.length} kanonische Tags · ${MERGES.length} Synonym-Merges · 1× Prune\n`)

  if (DRY) {
    console.log('create:', CANONICAL.join(', '))
    console.log('merge :', MERGES.map(([f, t]) => `${f}→${t}`).join(', '))
    console.log('prune : alle nicht-registrierten Tokens aus aktiven Memories')
    console.log('\n→ Zum Ausführen erneut mit --yes starten.')
    return
  }

  // 1. Vorbedingung: Register erreichbar (Mig 057 da)?
  const probe = await call('GET', '/api/project-memory-tags')
  if (probe.status >= 400) {
    console.error(`✗ Register nicht erreichbar (${probe.status}): ${probe.json.error || ''}`)
    console.error('  → Migration 057 auf der Instanz deployed? (PO/Portainer)')
    process.exit(1)
  }

  let created = 0, skipped = 0, merged = 0
  // 2. Kanonische Tags anlegen
  for (const tag of CANONICAL) {
    const r = await call('POST', '/api/project-memory-tags', { tag })
    if (r.status === 201) created++
    else if (r.status === 409) skipped++
    else { console.error(`✗ create ${tag}: ${r.status} ${r.json.error || ''}`); process.exit(1) }
  }
  console.log(`✓ Seed: ${created} angelegt, ${skipped} bereits vorhanden`)

  // 3. Synonyme anlegen + in kanonisch mergen
  for (const [from, to] of MERGES) {
    const c = await call('POST', '/api/project-memory-tags', { tag: from })
    if (c.status !== 201 && c.status !== 409) { console.error(`✗ create ${from}: ${c.status}`); process.exit(1) }
    const r = await call('POST', '/api/project-memory-tags/rename', { old: from, new: to })
    if (r.status >= 400) { console.error(`✗ rename ${from}→${to}: ${r.status} ${r.json.error || ''}`); process.exit(1) }
    merged += r.json.repointed || 0
    console.log(`✓ ${from} → ${to} (${r.json.repointed || 0} Memories repointet)`)
  }

  // 4. Singleton-/Drop-Bereinigung
  const p = await call('POST', '/api/project-memory-tags/prune')
  if (p.status >= 400) { console.error(`✗ prune: ${p.status} ${p.json.error || ''}`); process.exit(1) }
  console.log(`✓ Prune: ${p.json.touched} Memories bereinigt`)

  const final = await call('GET', '/api/project-memory-tags')
  console.log(`\n✓ FERTIG — Register hat jetzt ${final.json.length} Tags. Hard-Block ist AKTIV.`)
}

main().catch(e => { console.error(e); process.exit(1) })
