// MEM-25 T10: UserPromptSubmit-Trigger-Hook — Match-Logik (Signal-only).
// Grill 2026-06-21 D08: Hook gibt NUR ein Signal aus ("Projektwissen vorhanden"),
// injiziert keinen Inhalt. Trigger-Quelle = statische geteilte Datendatei
// (scripts/memory-triggers.json), von CLAUDE.md (T09) + Hook (T10) geteilt.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { loadTriggers, matchTriggers, renderSignal } from '../../scripts/memory-trigger-match.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')
const TRIGGERS = loadTriggers(resolve(repoRoot, 'scripts/memory-triggers.json'))

describe('MEM-25 T10 — memory-triggers.json data file', () => {
  test('is valid JSON: object of keyword → non-empty hint', () => {
    expect(typeof TRIGGERS).toBe('object')
    const keys = Object.keys(TRIGGERS)
    expect(keys.length).toBeGreaterThanOrEqual(10)
    for (const k of keys) {
      expect(k).toMatch(/^[a-z0-9][a-z0-9-]*$/) // kanonisches Tag-Format, lowercase
      expect(typeof TRIGGERS[k]).toBe('string')
      expect(TRIGGERS[k].length).toBeGreaterThan(0)
    }
  })

  test('keywords are a subset of the canonical register (no invented tags)', () => {
    const { CANONICAL } = JSON.parse(
      // canonical liegt als .mjs vor — Roh-Array per Regex ziehen, kein Import nötig
      JSON.stringify({ CANONICAL: extractCanonical(repoRoot) })
    )
    for (const k of Object.keys(TRIGGERS)) {
      expect(CANONICAL).toContain(k)
    }
  })
})

describe('MEM-25 T10 — matchTriggers', () => {
  test('matches a keyword at a word boundary', () => {
    const hits = matchTriggers('Wie läuft der deploy auf die NAS?', TRIGGERS)
    expect(hits.map((h) => h.tag)).toContain('deploy')
  })

  test('matches German inflection (trailing word chars allowed)', () => {
    const hits = matchTriggers('Wir müssen das nochmal deployen.', TRIGGERS)
    expect(hits.map((h) => h.tag)).toContain('deploy')
  })

  test('does NOT match keyword embedded after other letters (no false positive)', () => {
    const hits = matchTriggers('Es wurde gestern redeployed.', TRIGGERS)
    expect(hits.map((h) => h.tag)).not.toContain('deploy')
  })

  test('matches hyphenated keyword (gf-2)', () => {
    const hits = matchTriggers('Status von gf-2 ProjectPages?', TRIGGERS)
    expect(hits.map((h) => h.tag)).toContain('gf-2')
  })

  test('is case-insensitive', () => {
    const hits = matchTriggers('TAILSCALE serve geht nicht', TRIGGERS)
    expect(hits.map((h) => h.tag)).toContain('tailscale')
  })

  test('returns empty for a prompt without any trigger', () => {
    expect(matchTriggers('Bitte formatiere diese Tabelle neu.', TRIGGERS)).toEqual([])
  })

  test('returns multiple distinct hits, deduped', () => {
    const hits = matchTriggers('Beim deploy via portainer scheitert tailscale tailscale', TRIGGERS)
    const tags = hits.map((h) => h.tag)
    expect(tags).toContain('deploy')
    expect(tags).toContain('portainer')
    expect(tags).toContain('tailscale')
    expect(new Set(tags).size).toBe(tags.length) // dedupe
  })

  test('each hit carries its hint from the data file', () => {
    const [hit] = matchTriggers('tailscale', TRIGGERS)
    expect(hit.tag).toBe('tailscale')
    expect(hit.hint).toBe(TRIGGERS.tailscale)
  })
})

describe('MEM-25 T10 — renderSignal (signal-only, no content injection)', () => {
  test('renders nothing for no hits', () => {
    expect(renderSignal([])).toBe('')
  })

  test('signal names the keywords and the query path, not the answer', () => {
    const out = renderSignal(matchTriggers('deploy auf NAS', TRIGGERS))
    expect(out).toMatch(/Projektwissen/i)
    expect(out).toContain('deploy')
    expect(out).toMatch(/devd-cli memory query|devd_project_memory_query/)
  })
})

// --- Helper: CANONICAL-Array aus der .mjs-Datendatei ziehen (ohne ESM-Import) ---
function extractCanonical(root) {
  const src = readFileSync(resolve(root, 'scripts/memory-tag-register.data.mjs'), 'utf8')
  const m = src.match(/export const CANONICAL = \[([\s\S]*?)\]/)
  if (!m) return []
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}
