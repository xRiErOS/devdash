import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'
const MIG_038 = '038_v3_milestones_status_lifecycle.sql'
const MIG_039 = '039_v3_milestones_spec_path.sql'
const MIG_040 = '040_v3_component_notes.sql'
const DOWN_SQL = resolve(ROOT, 'migrations/_down/040_v3_component_notes_down.sql')

describe('T01 — Migration 040 component_notes', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m040-'))
    // 040 ist auf projects-Tabelle FK-bezogen. Snapshot 028 enthält projects;
    // wir laden trotzdem die 029/033/038/039-Migrations vor, damit der DB-Stand
    // production-näher ist und Cascade-Tests stabile Voraussetzungen haben.
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_033, { logDir })
    applyMigration(db, MIG_038, { logDir })
    applyMigration(db, MIG_039, { logDir })
    applyMigration(db, MIG_040, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('component_notes-Tabelle hat erwartete Spalten + Defaults', () => {
    const cols = db.prepare("PRAGMA table_info('component_notes')").all()
    const byName = Object.fromEntries(cols.map(c => [c.name, c]))
    expect(byName.id?.pk).toBe(1)
    expect(byName.project_id?.notnull).toBe(1)
    expect(byName.slug?.notnull).toBe(1)
    expect(byName.content?.notnull).toBe(1)
    expect(byName.created_at?.notnull).toBe(1)
    expect(byName.updated_at?.notnull).toBe(1)
    expect(byName.deleted_at?.notnull).toBe(0)
  })

  test('FK auf projects mit ON DELETE CASCADE', () => {
    db.pragma('foreign_keys = ON')
    const fks = db.prepare("PRAGMA foreign_key_list('component_notes')").all()
    const projectFk = fks.find(f => f.table === 'projects')
    expect(projectFk).toBeDefined()
    expect(projectFk.on_delete).toBe('CASCADE')
  })

  test('UNIQUE(project_id, slug) — nur ein aktiver Eintrag pro Slug', () => {
    db.prepare("INSERT INTO component_notes (project_id, slug, content) VALUES (?, ?, ?)").run(2, 'project-home.tabs.overview', 'erste')
    expect(() => {
      db.prepare("INSERT INTO component_notes (project_id, slug, content) VALUES (?, ?, ?)").run(2, 'project-home.tabs.overview', 'doppelt')
    }).toThrow(/UNIQUE constraint/i)
  })

  test('Soft-Delete erlaubt erneutes Einfügen desselben Slugs', () => {
    db.prepare("INSERT INTO component_notes (project_id, slug, content, deleted_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)").run(2, 'foo.bar.baz', 'alt')
    expect(() => {
      db.prepare("INSERT INTO component_notes (project_id, slug, content) VALUES (?, ?, ?)").run(2, 'foo.bar.baz', 'neu')
    }).not.toThrow()
  })

  test('Migration registriert in schema_migrations', () => {
    const versions = appliedMigrations(db)
    expect(versions).toContain(MIG_040)
  })

  test('Down-Migration entfernt Tabelle + Indizes', () => {
    const downSql = readFileSync(DOWN_SQL, 'utf8')
    db.exec(downSql)
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='component_notes'").all()
    expect(tables).toHaveLength(0)
  })
})
