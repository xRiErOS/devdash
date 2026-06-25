// MEM-25 (T08): Validierung der PO-freigegebenen Apply-Sequenz (Seed + Merge + Prune).
// Replay auf Lib-Ebene gegen eine geseedete DB → beweist den End-State, den das
// Apply-Script (scripts/apply-memory-tag-register.mjs) gegen die NAS-REST-API herstellt.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import { createMemory, listMemories } from '../../apps/backend/src/lib/projectMemories.js'
import { createTag, renameTag, listTags, pruneTagsNotInRegistry, getTagRowExists } from '../../apps/backend/src/lib/memoryTags.js'
import { CANONICAL, MERGES } from '../../scripts/memory-tag-register.data.mjs'

const P = 2

// Exakt die Komposition des Apply-Scripts, aber lib-direkt (das Script ruft dieselbe
// Logik über REST). createTag ist idempotent-tolerant via try/catch hier nachgebildet.
function applyRegister(db, projectId) {
  for (const tag of CANONICAL) {
    try { createTag(db, projectId, tag) } catch (e) { if (e.code !== 'TAG_DUPLICATE') throw e }
  }
  for (const [from, to] of MERGES) {
    try { createTag(db, projectId, from) } catch (e) { if (e.code !== 'TAG_DUPLICATE') throw e }
    renameTag(db, projectId, from, to)
  }
  return pruneTagsNotInRegistry(db, projectId)
}

describe('MEM-25 — PO-Apply-Sequenz End-State', () => {
  let db, logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: P, slug: 'devd', name: 'DevD', prefix: 'DD' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-mem25apply-'))
    applyMigration(db, '041_v3_project_memories.sql', { logDir })
    applyMigration(db, '057_v3_memory_tag_register.sql', { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('register ends at exactly the 53 canonical tags (synonyms folded away)', () => {
    applyRegister(db, P)
    const tags = listTags(db, P).map(t => t.tag).sort()
    expect(tags).toEqual([...CANONICAL].sort())
    expect(tags).toHaveLength(53)
    // synonyms must NOT survive as register rows
    for (const [from] of MERGES) expect(tags).not.toContain(from)
  })

  test('memory tags get remapped + deduped + pruned to canonical', () => {
    const a = createMemory(db, P, { category: 'convention', summary: 'a', tags: 'greenfield gf2 GF-2 storybook DD81 randomsingleton' })
    const b = createMemory(db, P, { category: 'convention', summary: 'b', tags: 'sstd-decision mobile frontend-rework' })
    const c = createMemory(db, P, { category: 'convention', summary: 'c', tags: 'decision convention' })
    applyRegister(db, P)
    const reload = id => listMemories(db, P, { includeSuperseded: true }).find(m => m.id === id).tags
    expect(reload(a.id)).toBe('gf-2 storybook')          // 3 gf-Synonyme → ein gf-2, Singletons weg
    expect(reload(b.id)).toBe('sstd mobile-ux frontend') // alle drei Merges greifen
    expect(reload(c.id)).toBe('')                        // beide gedroppt (nicht im Register)
  })

  test('apply is idempotent (second run = no error, same end-state)', () => {
    createMemory(db, P, { category: 'convention', summary: 'a', tags: 'greenfield storybook' })
    applyRegister(db, P)
    const r2 = applyRegister(db, P)
    expect(listTags(db, P)).toHaveLength(53)
    expect(r2.touched).toBe(0) // nichts mehr zu bereinigen
  })

  test('getTagRowExists helper reflects registry membership', () => {
    applyRegister(db, P)
    expect(getTagRowExists(db, P, 'gf-2')).toBe(true)
    expect(getTagRowExists(db, P, 'greenfield')).toBe(false)
  })
})
