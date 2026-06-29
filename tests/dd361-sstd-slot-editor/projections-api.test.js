// DD-361 (DD#49): SSTD-Slot-Editor. Backend-Vorbedingung des Editors ist, dass die beiden
// Read-All-Projektionen (Nächste Schritte ← offene project_todos; Journal ← session_notes)
// als eigenständige, exportierte Render-Funktionen verfügbar sind — sie speisen den neuen
// Read-Only-Endpoint GET /api/projects/:id/sstd/projections. Bis DD-361 waren renderNextSteps/
// renderJournal modul-privat. Diese Tests prüfen die Lib-Ebene (environment node):
//   (a) renderNextSteps listet offene ToDos als Bullet,
//   (b) renderJournal listet session_notes als Journal-Einträge,
//   (c) beide sind exportiert (sonst schlägt der Import oben hart fehl).
// Fixture-Muster gespiegelt von tests/mem16-sstd-slots/sstdSlots.test.js.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import { createMemory } from '../../apps/backend/src/lib/projectMemories.js'
import { insertTodo } from '../../apps/backend/src/lib/projectTodos.js'
import {
  PROJECTION_TITLES,
  renderNextSteps,
  renderJournal,
} from '../../apps/backend/src/lib/sstdSlots.js'

const PROJECT_ID = 7

describe('DD-361 — SSTD-Projektionen (renderNextSteps/renderJournal exportiert)', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: PROJECT_ID, slug: 'memory-system', name: 'Memory System', prefix: 'MEM' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd361-'))
    applyMigration(db, '037_v3_project_todos.sql', { logDir })
    applyMigration(db, '041_v3_project_memories.sql', { logDir })
    applyMigration(db, '042_v3_project_memory_anchor_stability.sql', { logDir })
    applyMigration(db, '043_v3_sstd_slots.sql', { logDir })
    applyMigration(db, '065_v3_dd2_19_memory_categories.sql', { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  // (c) Export-Smoke: schlägt der Import oben fehl, läuft die Suite gar nicht — hier
  // zusätzlich explizit als Funktionstyp geprüft.
  test('renderNextSteps und renderJournal sind exportierte Funktionen', () => {
    expect(typeof renderNextSteps).toBe('function')
    expect(typeof renderJournal).toBe('function')
  })

  // (a) renderNextSteps listet offene ToDos.
  test('renderNextSteps listet offene ToDos als Bullet, ignoriert erledigte', () => {
    insertTodo(db, PROJECT_ID, { label: 'DD-361 bauen' })
    insertTodo(db, PROJECT_ID, { label: 'Review machen', status: 'done' })
    const md = renderNextSteps(db, PROJECT_ID)
    expect(md).toContain(`## ${PROJECTION_TITLES.next_steps}`)
    expect(md).toContain('- DD-361 bauen')
    expect(md).not.toContain('Review machen')
  })

  test('renderNextSteps gibt null zurück, wenn keine offenen ToDos existieren', () => {
    expect(renderNextSteps(db, PROJECT_ID)).toBeNull()
  })

  // (b) renderJournal listet session_log-Einträge.
  test('renderJournal listet session_log als Session-Log-Einträge', () => {
    createMemory(db, PROJECT_ID, { category: 'session_log', summary: 'Heute DD-361 begonnen' })
    const md = renderJournal(db, PROJECT_ID)
    expect(md).toContain(`## ${PROJECTION_TITLES.journal}`)
    expect(md).toContain('- Heute DD-361 begonnen')
  })

  test('renderJournal gibt null zurück, wenn keine session_log-Memories existieren', () => {
    expect(renderJournal(db, PROJECT_ID)).toBeNull()
  })
})
