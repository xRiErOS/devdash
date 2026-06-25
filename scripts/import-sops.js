#!/usr/bin/env node
/**
 * MEM-23 (MEM#8): SOP-Cutover-Import. Liest die Vault-SOPs (Stand nach MEM-22) und upsertet sie
 * als DB-Rows + seedet die Trigger-Map. Einmal-Import; idempotent (Re-Run aktualisiert content,
 * dupliziert nicht). Nach dem Cutover ist die DB Master (SOP-D01), Vault-SOPs read-only.
 *
 * Voraussetzung: Migration 044_v3_sops.sql wurde angewandt (node scripts/migrate.js).
 *
 * Usage:
 *   node scripts/import-sops.js [--dry-run]
 *   DEVD_DB_PATH=/abs/path/devd.db node scripts/import-sops.js
 *   DEVD_SOP_VAULT_PATH="/abs/SOPs" node scripts/import-sops.js
 */

import Database from 'better-sqlite3'
import { existsSync, readdirSync } from 'fs'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { importSopsFromDir, SOP_FILES, DEFAULT_TRIGGERS } from '../server/lib/sops.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const DEFAULT_SOP_DIR = join(homedir(), 'Obsidian', 'Vault', '400 AI Agent', '480 SOPs')

function main() {
  const DRY_RUN = process.argv.includes('--dry-run')
  const DB_PATH = process.env.DEVD_DB_PATH || resolve(ROOT, 'data/devd.db')
  const SOP_DIR = process.env.DEVD_SOP_VAULT_PATH || DEFAULT_SOP_DIR

  if (!existsSync(SOP_DIR)) {
    console.error(`[error] SOP-Verzeichnis nicht gefunden: ${SOP_DIR}`)
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log(`[dry-run] SOP_DIR=${SOP_DIR}`)
    console.log(`[dry-run] DB_PATH=${DB_PATH}`)
    const present = Object.entries(SOP_FILES).filter(([file]) => existsSync(join(SOP_DIR, file)))
    console.log(`[dry-run] ${present.length}/${Object.keys(SOP_FILES).length} bekannte SOP-Dateien gefunden:`)
    for (const [file, key] of present) console.log(`  - ${key}  ←  ${file}`)
    console.log(`[dry-run] Trigger-Map: ${Object.keys(DEFAULT_TRIGGERS).join(', ')}`)
    console.log('[dry-run] Keine Änderungen an DB geschrieben.')
    return
  }

  if (!existsSync(DB_PATH)) {
    console.error(`[error] DB nicht gefunden: ${DB_PATH}`)
    process.exit(1)
  }

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const hasTable = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='sops'"
  ).get()
  if (!hasTable) {
    console.error('[error] Tabelle sops fehlt — zuerst Migration 044 anwenden (node scripts/migrate.js).')
    process.exit(1)
  }

  const { imported, triggers } = importSopsFromDir(db, SOP_DIR)
  db.close()

  console.log(`[ok] ${imported.length} SOP(s) importiert/aktualisiert:`)
  for (const key of imported) console.log(`  - ${key}`)
  console.log(`[ok] Trigger-Map geseedet: ${triggers.join(', ')}`)
}

main()
