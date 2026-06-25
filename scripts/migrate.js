#!/usr/bin/env node
/**
 * DevD Migration Runner. Idempotent via schema_migrations-Tabelle.
 *
 * Liest *.sql aus dem Migrations-Verzeichnis und wendet sie an.
 *
 * MIGRATIONS_DIR-Resolver-Reihenfolge (DD-249):
 *   1. ENV MIGRATIONS_DIR (absolut oder repo-relativ)
 *   2. /app/migrations (Container-Default, von Dockerfile baked)
 *   3. <repo>/migrations (lokaler Default)
 *
 * Die Verschiebung von data/migrations/ -> migrations/ behebt das
 * Bind-Mount-Masking aus dem NAS-Deploy: /volume2/docker/devd/data hat
 * /app/data/migrations vollstaendig ueberschattet (DD-247 Bug). Migrations
 * liegen jetzt ausserhalb des bind-gemounteten data-Verzeichnisses.
 *
 * Usage:
 *   node scripts/migrate.js [--dry-run]
 *   DEVD_DB_PATH=/abs/path/devd.db node scripts/migrate.js
 *   MIGRATIONS_DIR=/custom/migrations node scripts/migrate.js
 */

import Database from 'better-sqlite3'
import { readdirSync, copyFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { applyMigration } from '../server/lib/migrationRunner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

/**
 * Resolve the migrations directory.
 * Precedence: ENV override -> /app/migrations (container) -> <repo>/migrations (local).
 * Exported for testability (DD-249).
 */
export function resolveMigrationsDir({
  envValue = process.env.MIGRATIONS_DIR,
  repoRoot = ROOT,
  containerPath = '/app/migrations',
  fsCheck = existsSync,
} = {}) {
  if (envValue) {
    return resolve(envValue)
  }
  if (fsCheck(containerPath)) {
    return containerPath
  }
  return resolve(repoRoot, 'migrations')
}

function main() {
  const DRY_RUN = process.argv.includes('--dry-run')
  const DB_PATH = process.env.DEVD_DB_PATH || resolve(ROOT, 'data/devd.db')
  const MIGRATIONS_DIR = resolveMigrationsDir()
  // ENV-Override fuer Migration-Log-Verzeichnis (Container-Deploy mit Read-Only-Mount).
  const MIGRATIONS_LOG_DIR = process.env.DEVD_MIGRATIONS_LOG_DIR || resolve(ROOT, 'data/migrations-log')

  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`[error] Migrations-Verzeichnis nicht gefunden: ${MIGRATIONS_DIR}`)
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log(`[dry-run] MIGRATIONS_DIR=${MIGRATIONS_DIR}`)
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    console.log(`[dry-run] ${files.length} Migration(en) gefunden:`)
    for (const file of files) {
      console.log(`  - ${file}`)
    }
    console.log('[dry-run] Keine Aenderungen an DB geschrieben.')
    return
  }

  if (!existsSync(DB_PATH)) {
    console.error(`[error] DB nicht gefunden: ${DB_PATH}`)
    process.exit(1)
  }

  // Backup
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z'
  const backupPath = `${DB_PATH}.bak.${ts}`
  copyFileSync(DB_PATH, backupPath)
  console.log(`[backup] ${backupPath}`)

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const isApplied = version =>
    !!db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version)

  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()

  let applied = 0
  for (const file of files) {
    if (isApplied(file)) {
      console.log(`[skip]  ${file}`)
      continue
    }
    const { preResult, postResult } = applyMigration(db, file, { migrationsDir: MIGRATIONS_DIR, logDir: MIGRATIONS_LOG_DIR })
    if (preResult) console.log(`  [pre-hook] ${preResult.path} (${preResult.ids.length} rows)`)
    if (postResult) console.log(`  [post-hook] ${postResult.path} (${postResult.ids.length} rows)`)
    console.log(`[apply] ${file}`)
    applied += 1
  }

  console.log(`\n[done] ${applied} Migration(en) angewendet.`)

  console.log('\n--- schema_migrations ---')
  for (const row of db.prepare('SELECT version, applied_at FROM schema_migrations ORDER BY applied_at').all()) {
    console.log(`  ${row.version.padEnd(40)} ${row.applied_at}`)
  }

  console.log('\n--- projects ---')
  try {
    for (const row of db.prepare('SELECT id, slug, name FROM projects ORDER BY id').all()) {
      console.log(`  ${row.id}  ${row.slug.padEnd(20)} ${row.name}`)
    }
  } catch (_) {
    console.log('  (Tabelle existiert noch nicht)')
  }

  db.close()
}

// Run only when invoked directly (not on `import`).
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invokedDirectly) {
  main()
}
