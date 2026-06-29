import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
// DD-249: migrations moved from data/migrations -> migrations (bind-mount masking fix).
const DEFAULT_MIGRATIONS_DIR = resolve(ROOT, 'migrations')
const DEFAULT_LOG_DIR = resolve(ROOT, 'data/migrations-log')

// Migrations that require PRAGMA foreign_keys=OFF during apply (table-recreate pattern).
const FK_OFF_DURING_APPLY = new Set([
  '029_v3_milestone_target_date_required.sql',
  '038_v3_milestones_status_lifecycle.sql',
  '065_v3_dd2_19_memory_categories.sql',
])

export function ensureLogDir(logDir = DEFAULT_LOG_DIR) {
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true, mode: 0o700 })
  return logDir
}

export function preHook(db, migrationFile, { logDir = DEFAULT_LOG_DIR } = {}) {
  if (migrationFile === '029_v3_milestone_target_date_required.sql') {
    return dumpNullTargetDateMilestones(db, logDir)
  }
  return null
}

export function postHook(db, migrationFile, preResult, { logDir = DEFAULT_LOG_DIR } = {}) {
  if (migrationFile === '029_v3_milestone_target_date_required.sql') {
    return dumpBackfilledMilestones(db, preResult, logDir)
  }
  return null
}

function dumpNullTargetDateMilestones(db, logDir) {
  ensureLogDir(logDir)
  const rows = db.prepare(`
    SELECT id, project_id, name, created_at, target_date
    FROM milestones
    WHERE target_date IS NULL OR target_date = ''
  `).all()
  const payload = {
    migration: '029_v3_milestone_target_date_required',
    captured_at: new Date().toISOString(),
    count: rows.length,
    rows,
  }
  const path = join(logDir, '029-pre-backfill-dump.json')
  writeFileSync(path, JSON.stringify(payload, null, 2), { mode: 0o600 })
  return { path, ids: rows.map(r => r.id) }
}

function dumpBackfilledMilestones(db, preResult, logDir) {
  if (!preResult || !preResult.ids?.length) {
    const empty = {
      migration: '029_v3_milestone_target_date_required',
      captured_at: new Date().toISOString(),
      count: 0,
      rows: [],
      note: 'No NULL target_date rows existed pre-migration.',
    }
    const path = join(logDir, '029-post-backfill-diff.json')
    writeFileSync(path, JSON.stringify(empty, null, 2), { mode: 0o600 })
    return { path, ids: [] }
  }
  const placeholders = preResult.ids.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT id, project_id, name, created_at, target_date
    FROM milestones
    WHERE id IN (${placeholders})
  `).all(...preResult.ids)
  const payload = {
    migration: '029_v3_milestone_target_date_required',
    captured_at: new Date().toISOString(),
    count: rows.length,
    rows,
  }
  const path = join(logDir, '029-post-backfill-diff.json')
  writeFileSync(path, JSON.stringify(payload, null, 2), { mode: 0o600 })
  return { path, ids: rows.map(r => r.id) }
}

export function applyMigration(db, migrationFile, {
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  logDir = DEFAULT_LOG_DIR,
  sql,
} = {}) {
  const source = sql ?? readFileSync(join(migrationsDir, migrationFile), 'utf8')

  const preResult = preHook(db, migrationFile, { logDir })

  // Finding #1: FK-OFF muss in try/finally laufen — sonst bleibt FK auf DB-Connection deaktiviert wenn tx() throws.
  const needsFkOff = FK_OFF_DURING_APPLY.has(migrationFile)
  if (needsFkOff) db.pragma('foreign_keys = OFF')

  let txOk = false
  try {
    const tx = db.transaction(() => {
      db.exec(source)
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migrationFile)
    })
    tx()
    txOk = true
    if (needsFkOff) {
      const violations = db.prepare('PRAGMA foreign_key_check').all()
      if (violations.length > 0) {
        throw new Error(`FK violations after ${migrationFile}: ${JSON.stringify(violations)}`)
      }
    }
  } finally {
    if (needsFkOff) db.pragma('foreign_keys = ON')
  }
  if (!txOk) return { preResult, postResult: null }

  // Finding #6: postHook in try/catch — Failure nach tx.commit darf nicht propagieren ohne Logging,
  // da schema_migrations bereits committed ist. Wir markieren postHook als best-effort.
  let postResult = null
  try {
    postResult = postHook(db, migrationFile, preResult, { logDir })
  } catch (err) {
    console.warn(`[migration-runner] postHook failed for ${migrationFile} (migration applied successfully): ${err.message}`)
  }
  return { preResult, postResult }
}

export const __testing = {
  dumpNullTargetDateMilestones,
  dumpBackfilledMilestones,
  FK_OFF_DURING_APPLY,
  DEFAULT_LOG_DIR,
  DEFAULT_MIGRATIONS_DIR,
}
