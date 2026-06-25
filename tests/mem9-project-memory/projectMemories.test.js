// MEM-9 (MEM#5): project_memories MVP — Schema + Backend + FTS5.
// Projektgebundenes Memory als Master, entkoppelt vom globalen ~/.claude/memory.db.
// FTS5-first (NAS-tauglich, kein Ollama/sqlite-vec). Append-only via superseded_by.
// Test-Harness: createTestDb (Baseline durch 028) + applyMigration('041...').
// project_memories hängt nur an projects (in Baseline) → nur 041 anzuwenden.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import {
  listMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
  supersedeMemory,
  searchMemories,
  ProjectMemoryError,
} from '../../apps/backend/src/lib/projectMemories.js'

const MIG = '041_v3_project_memories.sql'
const PROJECT_ID = 7
const OTHER_PROJECT_ID = 8

describe('MEM-9 — project_memories Schema + FTS5 + CRUD', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: PROJECT_ID, slug: 'memory-system', name: 'Memory System', prefix: 'MEM' })
    seedProject(db, { id: OTHER_PROJECT_ID, slug: 'other', name: 'Other', prefix: 'OTH' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-mem9-'))
    applyMigration(db, MIG, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Migration 041 erzeugt project_memories + FTS5-Virtual-Table', () => {
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type IN ('table') AND name IN ('project_memories','project_memories_fts')`
    ).all().map(r => r.name).sort()
    expect(tables).toEqual(['project_memories', 'project_memories_fts'])
  })

  test('createMemory + getMemory roundtrip mit Defaults', () => {
    const created = createMemory(db, PROJECT_ID, {
      category: 'architecture_decision',
      summary: 'FTS5 statt Vektor zuerst',
      content: 'NAS-tauglich, kein Ollama nötig.',
      tags: ['fts5', 'phase1'],
      source_type: 'sstd',
      source_ref: 'MEM §4 D05',
    })
    expect(created.id).toBeGreaterThan(0)
    expect(created.project_id).toBe(PROJECT_ID)
    expect(created.importance).toBe(2)
    expect(created.pinned).toBe(0)
    expect(created.superseded_by).toBeNull()

    const fetched = getMemory(db, PROJECT_ID, created.id)
    expect(fetched.summary).toBe('FTS5 statt Vektor zuerst')
    expect(fetched.tags).toContain('fts5')
  })

  test('category-CHECK lehnt ungültige Kategorie ab', () => {
    expect(() => createMemory(db, PROJECT_ID, { category: 'nonsense', summary: 'x' }))
      .toThrow(ProjectMemoryError)
  })

  test('summary ist Pflichtfeld', () => {
    expect(() => createMemory(db, PROJECT_ID, { category: 'convention', summary: '   ' }))
      .toThrow(ProjectMemoryError)
  })

  test('listMemories ist project-scoped', () => {
    createMemory(db, PROJECT_ID, { category: 'convention', summary: 'A' })
    createMemory(db, OTHER_PROJECT_ID, { category: 'convention', summary: 'B' })
    const mine = listMemories(db, PROJECT_ID)
    expect(mine).toHaveLength(1)
    expect(mine[0].summary).toBe('A')
  })

  test('searchMemories findet via FTS5 über summary/content/tags, project-scoped', () => {
    createMemory(db, PROJECT_ID, { category: 'bug_pattern', summary: 'WebSocket reconnect loop', content: 'Subscriber-Map leakt bei Reconnect.', tags: ['websocket'] })
    createMemory(db, PROJECT_ID, { category: 'convention', summary: 'Catppuccin tokens', content: 'CSS-Variablen nutzen.', tags: ['css'] })
    createMemory(db, OTHER_PROJECT_ID, { category: 'bug_pattern', summary: 'WebSocket fremd', content: 'darf nicht matchen' })

    const hits = searchMemories(db, PROJECT_ID, 'websocket')
    expect(hits.length).toBe(1)
    expect(hits[0].summary).toBe('WebSocket reconnect loop')
  })

  test('searchMemories matcht auch über tags', () => {
    createMemory(db, PROJECT_ID, { category: 'convention', summary: 'Token-Regel', content: 'irgendwas', tags: ['catppuccin', 'design'] })
    const hits = searchMemories(db, PROJECT_ID, 'catppuccin')
    expect(hits.length).toBe(1)
  })

  test('searchMemories ist robust gegen FTS5-Sonderzeichen (kein Throw)', () => {
    createMemory(db, PROJECT_ID, { category: 'dead_end', summary: 'Pfad C:\\temp probiert', content: 'verworfen' })
    expect(() => searchMemories(db, PROJECT_ID, 'C:\\temp "quote" AND')).not.toThrow()
  })

  test('deleteMemory (soft) entfernt aus list + search', () => {
    const m = createMemory(db, PROJECT_ID, { category: 'session_note', summary: 'flüchtige Notiz reconnect', content: 'x' })
    deleteMemory(db, PROJECT_ID, m.id)
    expect(listMemories(db, PROJECT_ID)).toHaveLength(0)
    expect(searchMemories(db, PROJECT_ID, 'reconnect')).toHaveLength(0)
  })

  test('updateMemory ändert Felder + hält FTS5 konsistent', () => {
    const m = createMemory(db, PROJECT_ID, { category: 'convention', summary: 'alt begriff', content: 'c' })
    updateMemory(db, PROJECT_ID, m.id, { summary: 'neuer suchbegriff xyzzy', importance: 1 })
    const updated = getMemory(db, PROJECT_ID, m.id)
    expect(updated.summary).toBe('neuer suchbegriff xyzzy')
    expect(updated.importance).toBe(1)
    expect(searchMemories(db, PROJECT_ID, 'xyzzy')).toHaveLength(1)
    expect(searchMemories(db, PROJECT_ID, 'begriff').some(h => h.id === m.id && false)).toBe(false)
  })

  test('supersedeMemory: append-only — alte Row superseded, search liefert nur neue', () => {
    const old = createMemory(db, PROJECT_ID, { category: 'architecture_decision', summary: 'D01 zappelig entwurf', content: 'erste fassung' })
    const fresh = supersedeMemory(db, PROJECT_ID, old.id, { summary: 'D01 zappelig final', content: 'finale fassung' })

    const oldRow = getMemory(db, PROJECT_ID, old.id)
    expect(oldRow.superseded_by).toBe(fresh.id)

    const hits = searchMemories(db, PROJECT_ID, 'zappelig')
    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe(fresh.id)

    // alte Row bleibt abrufbar (append-only, kein Hard-Delete)
    expect(oldRow.deleted_at).toBeNull()
  })

  test('listMemories filtert nach category', () => {
    createMemory(db, PROJECT_ID, { category: 'bug_pattern', summary: 'bug1' })
    createMemory(db, PROJECT_ID, { category: 'convention', summary: 'conv1' })
    const bugs = listMemories(db, PROJECT_ID, { category: 'bug_pattern' })
    expect(bugs).toHaveLength(1)
    expect(bugs[0].summary).toBe('bug1')
  })
})
