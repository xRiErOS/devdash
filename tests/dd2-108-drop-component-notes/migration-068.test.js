import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'

const MIG_068 = '068_v3_dd2_108_drop_component_notes.sql'
const MIG_PREV = '067_v3_dd2_21_documents.sql'

function tableExists(db, name) {
  return !!db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(name)
}

// DD2-108: component_notes-Feature komplett entfernt — Migration 068 droppt die Tabelle.
describe('DD2-108 — Migration 068 drop component_notes', () => {
  let db
  let logDir

  beforeEach(() => {
    // Voller Schemastand bis 067 (component_notes via 040 noch vorhanden).
    db = createTestDb({ upToVersion: MIG_PREV })
    logDir = mkdtempSync(join(tmpdir(), 'devd-m068-'))
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('vor 068: component_notes existiert (via 040)', () => {
    expect(tableExists(db, 'component_notes')).toBe(true)
  })

  test('nach 068: component_notes ist weg + Migration registriert', () => {
    applyMigration(db, MIG_068, { logDir })
    expect(tableExists(db, 'component_notes')).toBe(false)
    expect(appliedMigrations(db)).toContain(MIG_068)
  })

  test('068 ist idempotent (IF EXISTS, doppelt anwendbar ohne Fehler)', () => {
    applyMigration(db, MIG_068, { logDir })
    // Tabelle bereits weg → erneutes DROP IF EXISTS darf nicht werfen.
    expect(() => db.exec('DROP TABLE IF EXISTS component_notes')).not.toThrow()
  })
})
