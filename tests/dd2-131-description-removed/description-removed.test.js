// DD2-131 (Sprint DD2#24) — description ist HART abgelöst (ersetzt DD-313/D30
// Soft-Deprecate). PO-Entscheidung Q02 (2026-06-28): Feld vollständig nicht mehr
// verfügbar. po_notes ist der einzige Issue-Freitext-Kanal.
//   - Migration 064 droppt die DB-Spalte backlog.description.
//   - Migration 063 (DD2-130) rettet zuvor etwaige Inhalte nach po_notes.
//   - Zod-Contracts (create/update) führen description nicht mehr → werden
//     beim Parsen verworfen.
//   - Der Capture-Pfad (POST /api/issues) bleibt davon unberührt: dort ist
//     `description` nur ein Wire-Alias der PWA, der nach po_notes gemappt wird.

import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { issueCreateContract, issueUpdateContract } from '../../packages/api-types/backlog.contracts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = resolve(__dirname, '../../apps/backend/migrations')
const DROP_MIGRATION = '064_v3_dd2_131_drop_backlog_description.sql'

describe('DD2-131 — description hard-removal', () => {
  test('Rettungs-Migration 063 läuft vor der Drop-Migration 064', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    const i063 = files.indexOf('063_v3_dd2_130_description_to_po_notes.sql')
    const i064 = files.indexOf(DROP_MIGRATION)
    expect(i063).toBeGreaterThanOrEqual(0)
    expect(i064).toBeGreaterThan(i063)
  })

  test('Migration 064 droppt die Spalte backlog.description', () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, DROP_MIGRATION), 'utf8')
    expect(sql).toMatch(/ALTER TABLE backlog DROP COLUMN description/i)
  })

  test('nach Migration 064 hat backlog keine description-Spalte mehr', () => {
    const db = createTestDb({ upToVersion: DROP_MIGRATION })
    const cols = db.prepare('PRAGMA table_info(backlog)').all().map(c => c.name)
    expect(cols).not.toContain('description')
    expect(cols).toContain('po_notes')
  })

  test('issueCreateContract verwirft description (nicht mehr im Schema)', () => {
    const parsed = issueCreateContract.safeParse({ title: 'X', type: 'feature', description: 'sollte verschwinden' })
    expect(parsed.success).toBe(true)
    expect(parsed.data).not.toHaveProperty('description')
    expect(issueCreateContract.shape).not.toHaveProperty('description')
    expect(issueCreateContract.shape).toHaveProperty('po_notes')
  })

  test('issueUpdateContract verwirft description (nicht mehr im Schema)', () => {
    const parsed = issueUpdateContract.safeParse({ description: 'sollte verschwinden' })
    expect(parsed.success).toBe(true)
    expect(parsed.data).not.toHaveProperty('description')
    expect(issueUpdateContract.shape).not.toHaveProperty('description')
  })
})
