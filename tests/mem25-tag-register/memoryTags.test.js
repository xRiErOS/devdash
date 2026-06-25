// MEM-25: memory_tags Register — Controlled Vocabulary gegen Tag-Drift.
// Grill 2026-06-21 D06-D11. Test-Harness wie mem9: createTestDb (Baseline) +
// project_memories (041) + memory_tags (057). Enforcement self-activating (Grace-Period).

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import { createMemory, listMemories, ProjectMemoryError } from '../../apps/backend/src/lib/projectMemories.js'
import {
  hasTagRegister,
  listTags,
  createTag,
  renameTag,
  deleteTag,
  suggestSimilarTags,
  validateTagsAgainstRegistry,
  pruneTagsNotInRegistry,
} from '../../apps/backend/src/lib/memoryTags.js'

const P = 7
const OTHER = 8

describe('MEM-25 — memory_tags Register', () => {
  let db, logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: P, slug: 'devd', name: 'DevD', prefix: 'DD' })
    seedProject(db, { id: OTHER, slug: 'other', name: 'Other', prefix: 'OTH' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-mem25-'))
    applyMigration(db, '041_v3_project_memories.sql', { logDir })
    applyMigration(db, '057_v3_memory_tag_register.sql', { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('hasTagRegister true once 057 applied', () => {
    expect(hasTagRegister(db)).toBe(true)
  })

  describe('CRUD', () => {
    test('createTag + listTags, projekt-scoped', () => {
      createTag(db, P, 'storybook', { description: 'GF-2 Storybook-Insel' })
      createTag(db, P, 'tailscale')
      createTag(db, OTHER, 'catppuccin')
      const tags = listTags(db, P).map(t => t.tag).sort()
      expect(tags).toEqual(['storybook', 'tailscale'])
      expect(listTags(db, OTHER).map(t => t.tag)).toEqual(['catppuccin'])
    })

    test('createTag rejects duplicate (UNIQUE per project)', () => {
      createTag(db, P, 'storybook')
      expect(() => createTag(db, P, 'storybook')).toThrow(ProjectMemoryError)
    })

    test('createTag rejects whitespace / invalid format', () => {
      expect(() => createTag(db, P, 'two words')).toThrow(ProjectMemoryError)
      expect(() => createTag(db, P, '')).toThrow(ProjectMemoryError)
    })

    test('listTags --query filters via FTS', () => {
      createTag(db, P, 'storybook')
      createTag(db, P, 'storybook-as-plan')
      createTag(db, P, 'tailscale')
      const hits = listTags(db, P, { query: 'storybook' }).map(t => t.tag).sort()
      expect(hits).toEqual(['storybook', 'storybook-as-plan'])
    })

    test('listTags carries usage_count', () => {
      createTag(db, P, 'storybook')
      createMemory(db, P, { category: 'convention', summary: 'a', tags: 'storybook' })
      createMemory(db, P, { category: 'convention', summary: 'b', tags: 'storybook' })
      const row = listTags(db, P).find(t => t.tag === 'storybook')
      expect(row.usage_count).toBe(2)
    })

    test('deleteTag removes from register, reports usage_count', () => {
      createTag(db, P, 'storybook')
      createMemory(db, P, { category: 'convention', summary: 'a', tags: 'storybook' })
      const res = deleteTag(db, P, 'storybook')
      expect(res.usage_count).toBe(1)
      expect(listTags(db, P)).toHaveLength(0)
    })
  })

  describe('enforcement (D07) — self-activating grace period (D11)', () => {
    test('empty register → NO enforcement (live writes survive pre-seed)', () => {
      const m = createMemory(db, P, { category: 'convention', summary: 'x', tags: 'anything goes' })
      expect(m.tags).toBe('anything goes')
    })

    test('non-empty register → hard block on unknown tag', () => {
      createTag(db, P, 'storybook')
      expect(() => createMemory(db, P, { category: 'convention', summary: 'x', tags: 'unknownword' }))
        .toThrow(/nicht im Register/i)
    })

    test('registered tag passes', () => {
      createTag(db, P, 'storybook')
      const m = createMemory(db, P, { category: 'convention', summary: 'x', tags: 'storybook' })
      expect(m.tags).toBe('storybook')
    })

    test('block error carries top-3 FTS suggestions', () => {
      createTag(db, P, 'storybook')
      createTag(db, P, 'tailscale')
      try {
        createMemory(db, P, { category: 'convention', summary: 'x', tags: 'storyboo' })
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ProjectMemoryError)
        expect(e.code).toBe('TAG_NOT_REGISTERED')
        expect(e.suggestions).toContain('storybook')
      }
    })

    test('enforcement is per-project (P register does not gate OTHER)', () => {
      createTag(db, P, 'storybook')
      const m = createMemory(db, OTHER, { category: 'convention', summary: 'x', tags: 'freeform' })
      expect(m.tags).toBe('freeform')
    })

    test('validateTagsAgainstRegistry returns normalized string on ok', () => {
      createTag(db, P, 'a'); createTag(db, P, 'b')
      expect(validateTagsAgainstRegistry(db, P, 'a b')).toBe('a b')
    })
  })

  describe('suggest', () => {
    test('suggestSimilarTags finds fuzzy matches', () => {
      createTag(db, P, 'storybook')
      createTag(db, P, 'portainer')
      expect(suggestSimilarTags(db, P, 'storyboo')).toContain('storybook')
    })
  })

  describe('renameTag = rename + merge (D09)', () => {
    test('rename folds free synonym into canonical, repoints memories', () => {
      createTag(db, P, 'gf-2')
      const m = createMemory(db, P, { category: 'convention', summary: 'x', tags: 'gf-2' })
      const res = renameTag(db, P, 'gf-2', 'greenfield-canon')
      expect(res.repointed).toBeGreaterThanOrEqual(1)
      const reloaded = listMemories(db, P).find(x => x.id === m.id)
      expect(reloaded.tags.split(' ')).toContain('greenfield-canon')
      expect(reloaded.tags.split(' ')).not.toContain('gf-2')
      expect(listTags(db, P).map(t => t.tag)).toContain('greenfield-canon')
      expect(listTags(db, P).map(t => t.tag)).not.toContain('gf-2')
    })

    test('rename into existing target merges + dedupes', () => {
      createTag(db, P, 'gf2')
      createTag(db, P, 'gf-2')
      const m = createMemory(db, P, { category: 'convention', summary: 'x', tags: 'gf2 gf-2' })
      renameTag(db, P, 'gf2', 'gf-2')
      const reloaded = listMemories(db, P).find(x => x.id === m.id)
      expect(reloaded.tags).toBe('gf-2') // deduped, single token
    })
  })

  describe('migration helper (T08)', () => {
    test('pruneTagsNotInRegistry strips unregistered tokens from memories', () => {
      // pre-seed memory with mixed tags while register empty (grace period)
      const m = createMemory(db, P, { category: 'convention', summary: 'x', tags: 'storybook singleton1 singleton2' })
      createTag(db, P, 'storybook')
      const res = pruneTagsNotInRegistry(db, P)
      expect(res.touched).toBe(1)
      const reloaded = listMemories(db, P).find(x => x.id === m.id)
      expect(reloaded.tags).toBe('storybook')
    })
  })
})
