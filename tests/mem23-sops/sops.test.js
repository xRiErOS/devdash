// MEM-23 (MEM#8): SOP-Entität — Schema + lib + Vault-Import + Trigger-Map.
// SOPs sind GLOBAL (SOP-D02: kein project_id). DB-Master (SOP-D01). Trigger-Map in DB (SOP-D03).
// Baut auf Migration 044 (sops + sop_triggers). createTestDb-Baseline (028) genügt — sops hängt
// an keiner anderen neuen Tabelle.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import {
  SOP_FILES,
  DEFAULT_TRIGGERS,
  getSop,
  listSops,
  upsertSop,
  editSop,
  getSopsByTrigger,
  setTrigger,
  importSopsFromDir,
  SopError,
} from '../../apps/backend/src/lib/sops.js'

describe('MEM-23 — SOP-Entität: schema + lib + trigger-map + import', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-mem23-'))
    applyMigration(db, '044_v3_sops.sql', { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Migration 044 legt sops + sop_triggers an (global, kein project_id)', () => {
    const sopCols = db.prepare(`PRAGMA table_info(sops)`).all().map(c => c.name)
    expect(sopCols).toEqual(expect.arrayContaining(['id', 'sop_key', 'title', 'content', 'source_path', 'updated_at']))
    expect(sopCols).not.toContain('project_id') // SOP-D02: nur global
    const trigCols = db.prepare(`PRAGMA table_info(sop_triggers)`).all().map(c => c.name)
    expect(trigCols).toEqual(expect.arrayContaining(['trigger_key', 'sop_id', 'position']))
  })

  test('sop_key ist UNIQUE', () => {
    upsertSop(db, { sop_key: 'sprint-durchfuehrung', title: 'SOP - Sprint Durchfuehrung', content: 'A' })
    // zweiter upsert auf gleichen key = update, kein zweiter Row
    upsertSop(db, { sop_key: 'sprint-durchfuehrung', title: 'SOP - Sprint Durchfuehrung', content: 'B' })
    const rows = db.prepare('SELECT COUNT(*) AS n FROM sops WHERE sop_key = ?').get('sprint-durchfuehrung')
    expect(rows.n).toBe(1)
  })

  test('upsertSop + getSop: CRUD-Roundtrip', () => {
    const created = upsertSop(db, { sop_key: 'issues-erfassen', title: 'SOP - Issues erfassen', content: 'Inhalt', source_path: 'SOP - Issues erfassen.md' })
    expect(created.sop_key).toBe('issues-erfassen')
    expect(created.content).toBe('Inhalt')
    const fetched = getSop(db, 'issues-erfassen')
    expect(fetched.title).toBe('SOP - Issues erfassen')
    expect(fetched.source_path).toBe('SOP - Issues erfassen.md')
  })

  test('upsertSop ist idempotent (last-write-wins auf content/title)', () => {
    upsertSop(db, { sop_key: 'issue-refinement', title: 'alt', content: 'v1' })
    const updated = upsertSop(db, { sop_key: 'issue-refinement', title: 'neu', content: 'v2' })
    expect(updated.title).toBe('neu')
    expect(updated.content).toBe('v2')
  })

  test('getSop für unbekannten key → 404 SopError', () => {
    try {
      getSop(db, 'gibt-es-nicht')
      throw new Error('sollte werfen')
    } catch (e) {
      expect(e).toBeInstanceOf(SopError)
      expect(e.statusCode).toBe(404)
      expect(e.code).toBe('SOP_NOT_FOUND')
    }
  })

  test('ungültiger sop_key wirft SopError', () => {
    expect(() => upsertSop(db, { sop_key: 'Hat Leerzeichen', title: 'X', content: '' })).toThrow(SopError)
    expect(() => upsertSop(db, { sop_key: 'UPPER', title: 'X', content: '' })).toThrow(SopError)
  })

  test('upsertSop ohne title → SopError TITLE_REQUIRED', () => {
    expect(() => upsertSop(db, { sop_key: 'set-up-starten', title: '', content: 'x' })).toThrow(SopError)
  })

  test('listSops liefert Metadaten ohne content, sortiert nach sop_key', () => {
    upsertSop(db, { sop_key: 'sprintplanung', title: 'SOP - Sprintplanung', content: 'lang' })
    upsertSop(db, { sop_key: 'issues-erfassen', title: 'SOP - Issues erfassen', content: 'lang' })
    const list = listSops(db)
    expect(list.map(s => s.sop_key)).toEqual(['issues-erfassen', 'sprintplanung'])
    expect(list[0]).not.toHaveProperty('content')
  })

  test('editSop (PUT-Pfad): aktualisiert content; 404 wenn SOP fehlt', () => {
    upsertSop(db, { sop_key: 'issue-ad-hoc', title: 'SOP - Issue ad hoc', content: 'alt' })
    const edited = editSop(db, 'issue-ad-hoc', { content: 'neu' })
    expect(edited.content).toBe('neu')
    expect(() => editSop(db, 'fehlt', { content: 'x' })).toThrow(SopError)
  })

  test('setTrigger + getSopsByTrigger: Resolution geordnet nach position', () => {
    upsertSop(db, { sop_key: 'issues-erfassen', title: 'SOP - Issues erfassen', content: 'E' })
    upsertSop(db, { sop_key: 'issue-refinement', title: 'SOP - Issue Refinement', content: 'R' })
    setTrigger(db, 'issue:create', 'issues-erfassen', 0)
    setTrigger(db, 'issue:create', 'issue-refinement', 1)
    const sops = getSopsByTrigger(db, 'issue:create')
    expect(sops.map(s => s.sop_key)).toEqual(['issues-erfassen', 'issue-refinement'])
    expect(sops[0].content).toBe('E')
  })

  test('setTrigger auf nicht existierende SOP → 404 SopError', () => {
    expect(() => setTrigger(db, 'sprint:start', 'gibt-es-nicht', 0)).toThrow(SopError)
  })

  test('getSopsByTrigger für unbekannten Trigger → leeres Array', () => {
    expect(getSopsByTrigger(db, 'unbekannt')).toEqual([])
  })

  test('importSopsFromDir: Cutover-Import + Trigger-Defaults, idempotent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'devd-mem23-sops-'))
    // Fixture-Dateien für drei bekannte SOPs anlegen.
    writeFileSync(join(dir, 'SOP - Sprint Durchfuehrung.md'), '# Sprint Durchfuehrung v1')
    writeFileSync(join(dir, 'SOP - Sprintplanung.md'), '# Sprintplanung')
    writeFileSync(join(dir, 'SOP - Issues erfassen.md'), '# Issues erfassen')
    writeFileSync(join(dir, 'SOP - Issue Refinement.md'), '# Issue Refinement')

    const r1 = importSopsFromDir(db, dir)
    expect(r1.imported).toEqual(expect.arrayContaining(['sprint-durchfuehrung', 'sprintplanung', 'issues-erfassen', 'issue-refinement']))
    expect(getSop(db, 'sprint-durchfuehrung').content).toBe('# Sprint Durchfuehrung v1')

    // Trigger-Defaults wurden geseedet.
    expect(getSopsByTrigger(db, 'sprint:start').map(s => s.sop_key)).toEqual(['sprint-durchfuehrung'])
    expect(getSopsByTrigger(db, 'issue:create').map(s => s.sop_key)).toEqual(['issues-erfassen', 'issue-refinement'])

    // Re-Run mit geändertem Inhalt: kein Duplikat, content aktualisiert.
    writeFileSync(join(dir, 'SOP - Sprint Durchfuehrung.md'), '# Sprint Durchfuehrung v2')
    importSopsFromDir(db, dir)
    const count = db.prepare('SELECT COUNT(*) AS n FROM sops WHERE sop_key = ?').get('sprint-durchfuehrung')
    expect(count.n).toBe(1)
    expect(getSop(db, 'sprint-durchfuehrung').content).toBe('# Sprint Durchfuehrung v2')
    // Trigger nicht dupliziert.
    const trigCount = db.prepare('SELECT COUNT(*) AS n FROM sop_triggers WHERE trigger_key = ?').get('issue:create')
    expect(trigCount.n).toBe(2)

    rmSync(dir, { recursive: true, force: true })
  })

  test('DEFAULT_TRIGGERS + SOP_FILES decken die geforderten Keys ab', () => {
    expect(Object.values(SOP_FILES)).toEqual(expect.arrayContaining([
      'sprint-durchfuehrung', 'sprintplanung', 'issues-erfassen', 'issue-refinement',
      'issue-ad-hoc', 'set-up-starten', 'user-input-datei',
    ]))
    expect(DEFAULT_TRIGGERS['sprint:start']).toEqual(['sprint-durchfuehrung'])
    expect(DEFAULT_TRIGGERS['sprint:create']).toEqual(['sprintplanung'])
    expect(DEFAULT_TRIGGERS['issue:create']).toEqual(['issues-erfassen', 'issue-refinement'])
  })
})
