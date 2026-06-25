// DD-459 (Bug): project_memory_log — tags-Array leakt in content statt in die tags-Spalte.
//
// Reproduziert 2026-06-02 in Sproutling (memory 163/164): manche MCP-Clients hängen bei
// fehlgeschlagenem Parameter-Parsing den Rest des Tool-Calls an den content-String:
//   "<echter content>...</content>\n<parameter name=\"tags\">[\"deploy\", ...]"
// → content trägt das Artefakt, tags-Spalte bleibt leer.
//
// Fix (Defense-in-Depth in server/lib/projectMemories.js): Artefakt aus content strippen,
// geleakte tags in die tags-Spalte rekonstruieren. Explizite tags des Callers haben Vorrang.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { createMemory, updateMemory, getMemory } from '../../server/lib/projectMemories.js'

const MIG = '041_v3_project_memories.sql'
const PROJECT_ID = 7

describe('DD-459 — tags-Leak im content abwehren', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: PROJECT_ID, slug: 'memory-system', name: 'Memory System', prefix: 'MEM' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd459-'))
    applyMigration(db, MIG, { logDir })
  })
  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  // Exakte Reproduktion der 163/164-Form: kein schließendes </parameter>, JSON-Array.
  const LEAKED = 'NAS-SMB-Permissions per chmod 644 verifiziert 2026-06-02.</content>\n<parameter name="tags">["deploy", "nas", "smb", "permissions", "changelog"]'

  test('createMemory: content-Artefakt wird gestrippt', () => {
    const row = createMemory(db, PROJECT_ID, { category: 'external_constraint', summary: 'NAS SMB', content: LEAKED })
    expect(row.content).toBe('NAS-SMB-Permissions per chmod 644 verifiziert 2026-06-02.')
    expect(row.content).not.toContain('</content>')
    expect(row.content).not.toContain('<parameter')
  })

  test('createMemory: geleakte tags landen in der tags-Spalte', () => {
    const row = createMemory(db, PROJECT_ID, { category: 'external_constraint', summary: 'NAS SMB', content: LEAKED })
    expect(row.tags).toBe('deploy nas smb permissions changelog')
  })

  test('explizit übergebene tags haben Vorrang vor rekonstruierten', () => {
    const row = createMemory(db, PROJECT_ID, {
      category: 'external_constraint', summary: 'NAS SMB', content: LEAKED, tags: ['explicit'],
    })
    expect(row.tags).toBe('explicit')
    expect(row.content).not.toContain('<parameter')
  })

  test('sauberer content bleibt unangetastet (kein Fehlalarm)', () => {
    const clean = 'Normaler Text der zufällig </content> erwähnt aber kein parameter-Block folgt.'
    const row = createMemory(db, PROJECT_ID, { category: 'convention', summary: 'clean', content: clean, tags: 'a b' })
    expect(row.content).toBe(clean)
    expect(row.tags).toBe('a b')
  })

  test('updateMemory: Artefakt im content-Update wird ebenfalls gestrippt + tags rekonstruiert', () => {
    const row = createMemory(db, PROJECT_ID, { category: 'convention', summary: 'x', content: 'alt' })
    const upd = updateMemory(db, PROJECT_ID, row.id, { content: LEAKED })
    expect(upd.content).toBe('NAS-SMB-Permissions per chmod 644 verifiziert 2026-06-02.')
    expect(upd.tags).toBe('deploy nas smb permissions changelog')
  })

  test('updateMemory: explizite tags im selben Call überschreiben Rekonstruktion', () => {
    const row = createMemory(db, PROJECT_ID, { category: 'convention', summary: 'x', content: 'alt' })
    const upd = updateMemory(db, PROJECT_ID, row.id, { content: LEAKED, tags: ['keep'] })
    expect(upd.tags).toBe('keep')
    expect(upd.content).not.toContain('<parameter')
  })

  test('content ohne tags-Leak: nur strippen, tags bleiben leer', () => {
    const onlyJunk = 'Echter Text.</content>\n<parameter name="importance">1'
    const row = createMemory(db, PROJECT_ID, { category: 'convention', summary: 'x', content: onlyJunk })
    expect(row.content).toBe('Echter Text.')
    expect(row.tags).toBe('')
  })
})
