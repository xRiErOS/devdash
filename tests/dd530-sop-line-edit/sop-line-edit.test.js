// DD-530: SOP zeilen-basiert lesen + editieren (CLI/MCP), analog SSTD-Slot-Edit.
// Token-effizient: patch/insert/delete einer einzelnen Zeile statt Whole-Content-PUT.
// editSopLine ist in server/lib/sops.js exportiert → funktional gegen in-memory-DB testbar,
// plus Source-Presence-Wiring für REST-Route + CLI + MCP.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { upsertSop, getSop, editSopLine, SOP_LINE_OPS, SopError } from '../../server/lib/sops.js'

describe('DD-530 — editSopLine', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd530-'))
    applyMigration(db, '044_v3_sops.sql', { logDir })
    upsertSop(db, { sop_key: 'demo', title: 'Demo', content: 'L1\nL2\nL3' })
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('OPS deckt patch/insert_after/insert_before/delete', () => {
    expect(SOP_LINE_OPS).toEqual(['patch', 'insert_after', 'insert_before', 'delete'])
  })

  test('patch ersetzt eine Zeile', () => {
    editSopLine(db, 'demo', { op: 'patch', line: 2, content: 'L2-neu' })
    expect(getSop(db, 'demo').content).toBe('L1\nL2-neu\nL3')
  })

  test('insert_after / insert_before fügen relativ ein', () => {
    editSopLine(db, 'demo', { op: 'insert_after', line: 1, content: 'L1.5' })
    expect(getSop(db, 'demo').content).toBe('L1\nL1.5\nL2\nL3')
    editSopLine(db, 'demo', { op: 'insert_before', line: 1, content: 'L0' })
    expect(getSop(db, 'demo').content).toBe('L0\nL1\nL1.5\nL2\nL3')
  })

  test('delete entfernt eine Zeile', () => {
    editSopLine(db, 'demo', { op: 'delete', line: 2 })
    expect(getSop(db, 'demo').content).toBe('L1\nL3')
  })

  test('expect-Guard: Mismatch wirft 409, kein Write', () => {
    expect(() => editSopLine(db, 'demo', { op: 'patch', line: 2, content: 'x', expect: 'FALSCH' }))
      .toThrow(SopError)
    expect(getSop(db, 'demo').content).toBe('L1\nL2\nL3') // unverändert
    // korrekter Anker schreibt:
    editSopLine(db, 'demo', { op: 'patch', line: 2, content: 'L2x', expect: 'L2' })
    expect(getSop(db, 'demo').content).toBe('L1\nL2x\nL3')
  })

  test('line außerhalb des Bereichs wirft', () => {
    expect(() => editSopLine(db, 'demo', { op: 'patch', line: 99, content: 'x' })).toThrow(SopError)
  })

  test('unbekannter SOP-Key wirft 404', () => {
    expect(() => editSopLine(db, 'gibtsnicht', { op: 'patch', line: 1, content: 'x' })).toThrow(SopError)
  })
})

describe('DD-530 — Wiring', () => {
  const api = readFileSync('server/api.js', 'utf8')
  const cli = readFileSync('bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')

  test('REST PATCH /api/sops/:key/line ruft editSopLine', () => {
    expect(api).toMatch(/app\.patch\('\/api\/sops\/:key\/line'/)
    expect(api).toMatch(/editSopLine\(db, req\.params\.key/)
  })

  test('CLI exposes sop list/show/edit (show --numbered für Zeilennummern)', () => {
    for (const c of ["'sop:list'", "'sop:show'", "'sop:edit'"]) expect(cli).toContain(c)
    expect(cli).toMatch(/PATCH', `\/api\/sops\/\$\{encodeURIComponent\(key\)\}\/line`/)
  })

  test('MCP registers devd_sop_list/get/edit', () => {
    for (const t of ['devd_sop_list', 'devd_sop_get', 'devd_sop_edit']) expect(mcp).toContain(`'${t}'`)
  })
})
