import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'

// Migration 060 — Einmaliger Heal der Verdict↔Status-Divergenz (SPF-161).
// Schema bis 059 aufbauen, divergente Zeile seeden, 060-SQL anwenden, prüfen.

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATION_060 = resolve(__dirname, '../../apps/backend/migrations/060_v3_heal_passed_verdict_divergence.sql')
const UP_TO = '059_v3_drop_acceptance_test_instruction.sql'

function applyHeal(db) {
  db.exec(readFileSync(MIGRATION_060, 'utf8'))
}

let n = 9300
function seedIssue(db, status) {
  seedProject(db)
  const number = ++n
  const ins = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(TEST_PROJECT_ID, number, 'Issue ' + number, 'feature', status)
  return Number(ins.lastInsertRowid)
}
function seedRound(db, backlogId, reviewStatus, roundNumber) {
  db.prepare(`
    INSERT INTO review_feedback (backlog_id, round_number, review_status, comment)
    VALUES (?, ?, ?, ?)
  `).run(backlogId, roundNumber, reviewStatus, reviewStatus === 'not_passed' ? 'x' : null)
}
const statusOf = (db, id) => db.prepare('SELECT status FROM backlog WHERE id = ?').get(id).status

describe('Migration 060 — Heal passed↔not_passed-Divergenz', () => {
  test('divergente Zeile (passed + jüngstes not_passed) wird auf rejected geheilt', () => {
    const db = createTestDb({ upToVersion: UP_TO })
    const id = seedIssue(db, 'passed')
    seedRound(db, id, 'passed', 1)
    seedRound(db, id, 'not_passed', 2)

    applyHeal(db)

    expect(statusOf(db, id)).toBe('rejected')
  })

  test('konsistentes passed-Issue (jüngstes passed) bleibt unberührt', () => {
    const db = createTestDb({ upToVersion: UP_TO })
    const id = seedIssue(db, 'passed')
    seedRound(db, id, 'not_passed', 1)
    seedRound(db, id, 'passed', 2)

    applyHeal(db)

    expect(statusOf(db, id)).toBe('passed')
  })

  test('idempotent: zweiter Lauf ist No-Op', () => {
    const db = createTestDb({ upToVersion: UP_TO })
    const id = seedIssue(db, 'passed')
    seedRound(db, id, 'not_passed', 1)

    applyHeal(db)
    expect(statusOf(db, id)).toBe('rejected')
    applyHeal(db) // erneut — darf nicht erneut greifen / nicht werfen
    expect(statusOf(db, id)).toBe('rejected')
  })
})
