import Database from 'better-sqlite3'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
// DD-249/DD-358: migrations live in repo-root migrations/ (matches migrationRunner DEFAULT_MIGRATIONS_DIR), not data/migrations.
const MIGRATIONS_DIR = resolve(ROOT, 'apps/backend/migrations')
const SNAPSHOT_PATH = resolve(__dirname, 'baseline-snapshot.sql')

// Snapshot reflects Production schema after migration 028 (last applied pre-M2).
const SNAPSHOT_THROUGH = '028_v3_milestone_done_count_logic.sql'

export function listMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) return []
  return readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
}

export function migrationsAfterSnapshot() {
  return listMigrations().filter(f => f > SNAPSHOT_THROUGH)
}

export function migrationsThroughSnapshot() {
  return listMigrations().filter(f => f <= SNAPSHOT_THROUGH)
}

export function createTestDb({ upToVersion, throwOnMigrationError = true } = {}) {
  const db = new Database(':memory:')
  db.pragma('journal_mode = MEMORY')
  db.pragma('foreign_keys = ON')

  if (!existsSync(SNAPSHOT_PATH)) {
    throw new Error(`Snapshot fehlt: ${SNAPSHOT_PATH}. Regenerieren via: sqlite3 data/devd.db.cutover-2026-05-22.archive ".schema" > ${SNAPSHOT_PATH}`)
  }
  const snapshotSql = readFileSync(SNAPSHOT_PATH, 'utf8')
    .replace(/CREATE TABLE sqlite_sequence\([^)]*\);/g, '')
  db.exec(snapshotSql)

  const seedApplied = db.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)')
  for (const file of migrationsThroughSnapshot()) {
    seedApplied.run(file)
  }

  if (!upToVersion) return db

  for (const file of migrationsAfterSnapshot()) {
    if (file > upToVersion) break
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    try {
      const tx = db.transaction(() => {
        db.exec(sql)
        seedApplied.run(file)
      })
      tx()
    } catch (err) {
      if (throwOnMigrationError) throw new Error(`Migration ${file} failed: ${err.message}`)
      console.warn(`[test-db] migration ${file} skipped: ${err.message}`)
    }
  }

  return db
}

export function appliedMigrations(db) {
  return db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(r => r.version)
}
