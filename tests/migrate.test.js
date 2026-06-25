/**
 * DD-249: migrate.js MIGRATIONS_DIR-Refactor — Vitest suite.
 *
 * Coverage:
 *   1. resolveMigrationsDir() precedence (ENV > /app/migrations > repo/migrations)
 *   2. Migrations-Verzeichnis enthält alle 026 → 031 Files am neuen Pfad
 *   3. Runner-Idempotenz: schema_migrations PK + skip-on-applied (synthetic migrations)
 *   4. loadMigrationsUpTo() — Helper applies sequence to in-memory DB
 *
 * Idempotency-Tests laufen gegen synthetische SQL-Snippets im Temp-Verzeichnis,
 * NICHT gegen die echten Production-Migrationen (die ein vollständiges
 * Pre-003-Baseline-Schema brauchen würden). Ziel ist die Runner-Logik zu
 * validieren, nicht die Migration-Inhalte.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { readdirSync, readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

import { resolveMigrationsDir } from '../scripts/migrate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const MIGRATIONS_DIR = resolve(REPO_ROOT, 'migrations')

/**
 * Generic in-memory migration runner. Mirrors the loop in scripts/migrate.js
 * without the file-system DB / backup code. Applies any file in
 * `migrationsDir` ending in .sql whose name is <= `upTo` (lex sort), skips
 * any already in schema_migrations, and writes to a transient :memory: DB.
 *
 * Exported for reuse by other test suites (DD-249 acceptance).
 */
export function loadMigrationsUpTo(upTo, { migrationsDir = MIGRATIONS_DIR, seedSql = '' } = {}) {
  const db = new Database(':memory:')
  db.pragma('journal_mode = MEMORY')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  if (seedSql) db.exec(seedSql)

  const isApplied = v => !!db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(v)

  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  const applied = []
  const skipped = []
  for (const file of files) {
    if (upTo && file > upTo) break
    if (isApplied(file)) {
      skipped.push(file)
      continue
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    const tx = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file)
    })
    tx()
    applied.push(file)
  }
  return { db, applied, skipped }
}

describe('DD-249 — resolveMigrationsDir()', () => {
  it('respects MIGRATIONS_DIR ENV override (absolute path)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'devd-mig-'))
    try {
      const result = resolveMigrationsDir({ envValue: tmp })
      expect(result).toBe(resolve(tmp))
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('falls back to /app/migrations when present (simulated)', () => {
    const result = resolveMigrationsDir({
      envValue: undefined,
      repoRoot: '/nonexistent-repo',
      containerPath: '/app/migrations',
      fsCheck: p => p === '/app/migrations',
    })
    expect(result).toBe('/app/migrations')
  })

  it('falls back to <repo>/migrations when neither ENV nor container path present', () => {
    const result = resolveMigrationsDir({
      envValue: undefined,
      repoRoot: REPO_ROOT,
      containerPath: '/nonexistent/app/migrations',
      fsCheck: () => false,
    })
    expect(result).toBe(MIGRATIONS_DIR)
  })

  it('ENV override beats container path', () => {
    const result = resolveMigrationsDir({
      envValue: '/custom/migrations',
      containerPath: '/app/migrations',
      fsCheck: () => true,
    })
    expect(result).toBe('/custom/migrations')
  })
})

describe('DD-249 — migrations directory at new location', () => {
  it('migrations/ directory exists at repo root', () => {
    expect(existsSync(MIGRATIONS_DIR)).toBe(true)
  })

  it('contains all expected migrations 003 → 031', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    expect(files.length).toBeGreaterThanOrEqual(29)
    expect(files[0]).toBe('003_v3_multitenant.sql')
    expect(files).toContain('029_v3_milestone_target_date_required.sql')
    expect(files).toContain('030_v3_milestone_dependencies.sql')
    expect(files).toContain('031_v3_milestone_dod_items.sql')
  })

  it('old data/migrations/ path is gone', () => {
    const oldPath = resolve(REPO_ROOT, 'data/migrations')
    expect(existsSync(oldPath)).toBe(false)
  })

  it('listing migrations from the new directory yields a sorted, unique sequence', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    const sorted = [...files].sort()
    expect(files).toEqual(sorted)
    expect(new Set(files).size).toBe(files.length)
  })
})

describe('DD-249 — runner idempotency (synthetic migrations)', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'devd-mig-syn-'))
    writeFileSync(join(tmpDir, '001_create_a.sql'), 'CREATE TABLE a (id INTEGER PRIMARY KEY);')
    writeFileSync(join(tmpDir, '002_create_b.sql'), 'CREATE TABLE b (id INTEGER PRIMARY KEY);')
    writeFileSync(join(tmpDir, '003_create_c.sql'), 'CREATE TABLE c (id INTEGER PRIMARY KEY);')
  })

  it('applies each migration exactly once on first run', () => {
    const { db, applied, skipped } = loadMigrationsUpTo(undefined, { migrationsDir: tmpDir })
    expect(applied).toEqual(['001_create_a.sql', '002_create_b.sql', '003_create_c.sql'])
    expect(skipped).toEqual([])
    const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all()
    expect(rows.map(r => r.version)).toEqual(applied)
  })

  it('schema_migrations PK prevents double-insert on re-attempt', () => {
    const { db } = loadMigrationsUpTo(undefined, { migrationsDir: tmpDir })
    expect(() => {
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run('001_create_a.sql')
    }).toThrow(/UNIQUE constraint failed/)
  })

  it('skips already-applied migrations on a second pass (idempotent run)', () => {
    // First pass: apply all three.
    const seedRecords = []
    {
      const { applied } = loadMigrationsUpTo(undefined, { migrationsDir: tmpDir })
      seedRecords.push(...applied)
    }
    expect(seedRecords).toHaveLength(3)

    // Second pass: seed schema_migrations with the same versions, expect zero re-applies.
    const seedSql = seedRecords
      .map(v => `INSERT INTO schema_migrations (version) VALUES ('${v}');`)
      .join('\n')
    const { applied, skipped } = loadMigrationsUpTo(undefined, { migrationsDir: tmpDir, seedSql })
    expect(applied).toEqual([])
    expect(skipped).toEqual(seedRecords)
  })

  it('respects upTo cutoff (only applies migrations <= upTo)', () => {
    const { applied } = loadMigrationsUpTo('002_create_b.sql', { migrationsDir: tmpDir })
    expect(applied).toEqual(['001_create_a.sql', '002_create_b.sql'])
  })
})

describe('DD-249 — production migrations sequence (smoke)', () => {
  it('lists migrations 003 → latest in lex order from the new location', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    // DD-306: Lex-Order-Check ist robust gegen neu hinzugefügte Migrations —
    // statt slice-Anchor auf hartcodierter "letzter Migration" prüfen wir
    // Set-Inclusion + Sortier-Konsistenz.
    expect(files).toContain('034_v3_backlog_acceptance_criteria.sql')
    expect(files).toContain('035_v3_subtasks.sql')
    expect(files).toContain('036_v3_description_soft_deprecated.sql')
    expect(files).toContain('037_v3_project_todos.sql')
    expect(files).toContain('038_v3_milestones_status_lifecycle.sql')
    // Sortier-Sanity: 036 kommt vor 037 vor 038.
    expect(files.indexOf('036_v3_description_soft_deprecated.sql'))
      .toBeLessThan(files.indexOf('037_v3_project_todos.sql'))
    expect(files.indexOf('037_v3_project_todos.sql'))
      .toBeLessThan(files.indexOf('038_v3_milestones_status_lifecycle.sql'))
  })
})


describe('DD-311 — backlog.acceptance_criteria migration', () => {
  it('adds nullable acceptance_criteria TEXT without mutating existing rows', () => {
    const seedSql = `
      CREATE TABLE backlog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL
      );
      INSERT INTO backlog (title) VALUES ('existing issue');
    `

    const tmp = mkdtempSync(join(tmpdir(), 'devd-dd311-'))
    try {
      writeFileSync(
        join(tmp, '034_v3_backlog_acceptance_criteria.sql'),
        readFileSync(join(MIGRATIONS_DIR, '034_v3_backlog_acceptance_criteria.sql'), 'utf8'),
      )
      const { db, applied } = loadMigrationsUpTo('034_v3_backlog_acceptance_criteria.sql', {
        migrationsDir: tmp,
        seedSql,
      })

      expect(applied).toEqual(['034_v3_backlog_acceptance_criteria.sql'])
      const cols = db.prepare('PRAGMA table_info(backlog)').all()
      const col = cols.find(c => c.name === 'acceptance_criteria')
      expect(col).toBeDefined()
      expect(col.type.toUpperCase()).toBe('TEXT')
      expect(col.notnull).toBe(0)
      expect(col.dflt_value).toBeNull()

      const row = db.prepare('SELECT title, acceptance_criteria FROM backlog WHERE id = 1').get()
      expect(row).toEqual({ title: 'existing issue', acceptance_criteria: null })
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})


describe('DD-312 — subtasks migration', () => {
  it('creates subtasks with open/done lifecycle, ordering, and parent cascade', () => {
    const seedSql = `
      CREATE TABLE backlog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL
      );
      INSERT INTO backlog (title) VALUES ('parent issue');
    `
    const tmp = mkdtempSync(join(tmpdir(), 'devd-dd312-'))
    try {
      for (const file of ['034_v3_backlog_acceptance_criteria.sql', '035_v3_subtasks.sql']) {
        writeFileSync(join(tmp, file), readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
      }
      const { db, applied } = loadMigrationsUpTo('035_v3_subtasks.sql', {
        migrationsDir: tmp,
        seedSql,
      })
      expect(applied).toEqual([
        '034_v3_backlog_acceptance_criteria.sql',
        '035_v3_subtasks.sql',
      ])

      const cols = db.prepare('PRAGMA table_info(subtasks)').all()
      expect(cols.map(c => c.name)).toEqual([
        'id', 'backlog_id', 'title', 'qa_criteria', 'status', 'position',
        'created_at', 'updated_at', 'completed_at',
      ])
      const statusCol = cols.find(c => c.name === 'status')
      expect(statusCol.notnull).toBe(1)
      expect(String(statusCol.dflt_value).replaceAll("'", '')).toBe('open')

      const created = db.prepare(
        'INSERT INTO subtasks (backlog_id, title, qa_criteria, position) VALUES (?, ?, ?, ?)'
      ).run(1, 'Write API tests', 'Create, update, done guard', 10)
      const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(created.lastInsertRowid)
      expect(subtask).toMatchObject({
        backlog_id: 1,
        title: 'Write API tests',
        qa_criteria: 'Create, update, done guard',
        status: 'open',
        position: 10,
        completed_at: null,
      })
      expect(() => db.prepare(
        "INSERT INTO subtasks (backlog_id, title, status) VALUES (1, 'bad', 'blocked')"
      ).run()).toThrow(/CHECK constraint failed/)

      const indexes = db.prepare('PRAGMA index_list(subtasks)').all()
      expect(indexes.some(i => i.name === 'idx_subtasks_backlog')).toBe(true)

      db.prepare('DELETE FROM backlog WHERE id = 1').run()
      const remaining = db.prepare('SELECT COUNT(*) AS c FROM subtasks').get()
      expect(remaining.c).toBe(0)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
