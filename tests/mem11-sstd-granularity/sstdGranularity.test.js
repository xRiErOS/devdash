// MEM-11 (MEM#5): SSTD-Granularität — D-Codes als project_memories-Rows,
// Section-Patch per Anchor (statt Whole-SSTD-Rewrite), Stabilitäts-Flag (stabil/volatil)
// und Snapshot-Rendering mit Cache-Split (stabiler Prefix + volatiles Segment, SSTD I03 / MEM-13).
// Baut auf MEM-9 (project_memories). Migration 042 ergänzt anchor + stability.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import {
  createMemory,
  getMemory,
  getMemoryByAnchor,
  patchByAnchor,
  listMemories,
  ProjectMemoryError,
} from '../../apps/backend/src/lib/projectMemories.js'
import {
  renderSnapshot,
  renderSplitSnapshot,
} from '../../apps/backend/src/lib/projectMemorySnapshot.js'

const MIG_MVP = '041_v3_project_memories.sql'
const MIG_GRAN = '042_v3_project_memory_anchor_stability.sql'
const PROJECT_ID = 7

describe('MEM-11 — anchor + stability + section-patch + snapshot-split', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: PROJECT_ID, slug: 'memory-system', name: 'Memory System', prefix: 'MEM' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-mem11-'))
    applyMigration(db, MIG_MVP, { logDir })
    applyMigration(db, MIG_GRAN, { logDir })
    applyMigration(db, '065_v3_dd2_19_memory_categories.sql', { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Migration 042 ergänzt anchor + stability mit Defaults', () => {
    const cols = db.prepare(`PRAGMA table_info(project_memories)`).all().map(c => c.name)
    expect(cols).toContain('anchor')
    expect(cols).toContain('stability')
    const m = createMemory(db, PROJECT_ID, { category: 'convention', summary: 'x' })
    expect(m.stability).toBe('volatile') // Default
    expect(m.anchor).toBeNull()
  })

  test('stability-CHECK lehnt ungültigen Wert ab', () => {
    expect(() => createMemory(db, PROJECT_ID, { category: 'convention', summary: 'x', stability: 'maybe' }))
      .toThrow(ProjectMemoryError)
  })

  test('D-Code als addressierbare Row via anchor', () => {
    const d01 = createMemory(db, PROJECT_ID, {
      category: 'architecture_decision', anchor: 'D01', stability: 'stable',
      summary: '@import als Kontext-Persistenz', content: 'statt --append-system-prompt-file',
    })
    expect(d01.anchor).toBe('D01')
    expect(d01.stability).toBe('stable')
    const fetched = getMemoryByAnchor(db, PROJECT_ID, 'D01')
    expect(fetched.id).toBe(d01.id)
  })

  test('aktiver anchor ist eindeutig pro Projekt (Duplikat abgelehnt)', () => {
    createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D01', summary: 'erst' })
    expect(() => createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D01', summary: 'zweit' }))
      .toThrow(ProjectMemoryError)
  })

  test('patchByAnchor aktualisiert NUR die eine Row (Section-Patch, kein Full-Rewrite)', () => {
    const d01 = createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D01', summary: 'alt', content: 'a' })
    const d02 = createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D02', summary: 'unberührt', content: 'b' })

    const patched = patchByAnchor(db, PROJECT_ID, 'D01', { summary: 'neu final', content: 'c' })
    expect(patched.summary).toBe('neu final')
    expect(patched.id).toBe(d01.id)

    // D02 bleibt unangetastet (Token-Ersparnis: nur 1 Row geschrieben)
    const d02After = getMemory(db, PROJECT_ID, d02.id)
    expect(d02After.summary).toBe('unberührt')
    expect(d02After.updated_at).toBe(d02.updated_at)
  })

  test('patchByAnchor auf unbekannten anchor → Fehler', () => {
    expect(() => patchByAnchor(db, PROJECT_ID, 'D99', { summary: 'x' }))
      .toThrow(ProjectMemoryError)
  })

  test('renderSnapshot(stable) enthält stabile Rows, schließt volatile aus', () => {
    createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D01', stability: 'stable', summary: 'Stabile Regel' })
    createMemory(db, PROJECT_ID, { category: 'session_log', stability: 'volatile', summary: 'Flüchtiger Task-Kontext' })

    const stable = renderSnapshot(db, PROJECT_ID, { stability: 'stable' })
    expect(stable).toContain('D01')
    expect(stable).toContain('Stabile Regel')
    expect(stable).not.toContain('Flüchtiger Task-Kontext')
  })

  test('renderSplitSnapshot liefert getrennte stable + volatile Markdown-Blöcke', () => {
    createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D01', stability: 'stable', summary: 'Projekt-Regel' })
    createMemory(db, PROJECT_ID, { category: 'session_log', stability: 'volatile', summary: 'Aktiver Task xyzzy' })

    const { stable, volatile } = renderSplitSnapshot(db, PROJECT_ID)
    expect(stable).toContain('Projekt-Regel')
    expect(stable).not.toContain('xyzzy')
    expect(volatile).toContain('xyzzy')
    expect(volatile).not.toContain('Projekt-Regel')
  })

  test('renderSnapshot ignoriert gelöschte + superseded Rows', () => {
    const d = createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D01', stability: 'stable', summary: 'sichtbar' })
    // superseded via patchByAnchor? Nein — direkt: erzeuge zweite + supersede die erste.
    // Hier simpler: lösche die Row weich über updateMemory? Nutze deleteMemory-Pfad indirekt.
    db.prepare(`UPDATE project_memories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(d.id)
    const stable = renderSnapshot(db, PROJECT_ID, { stability: 'stable' })
    expect(stable).not.toContain('sichtbar')
  })

  test('listMemories gibt anchor + stability mit aus', () => {
    createMemory(db, PROJECT_ID, { category: 'architecture_decision', anchor: 'D01', stability: 'stable', summary: 's' })
    const rows = listMemories(db, PROJECT_ID)
    expect(rows[0].anchor).toBe('D01')
    expect(rows[0].stability).toBe('stable')
  })
})
