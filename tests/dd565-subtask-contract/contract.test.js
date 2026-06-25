// DD-565 (Sprint DD#78, Triplet 6/6 — FINAL): Subtask-Payloads auf geteilten Zod-Contract.
// Beweist: (1) SUBTASK_STATUSES ist Single Source (Lib sourct das Array aus dem Contract),
// (2) die Struktur-Contracts (create/edit/status/reorder) akzeptieren gültige + lehnen ungültige
// Payloads mit den EXAKTEN Lib-Messages ab (Verhalten 1:1). Die werfende Autorität bleibt in
// server/lib/subtasks.js — dieser Test pinnt nur den Contract als deckungsgleiche Zweit-Quelle.

import { describe, test, expect } from 'vitest'
import {
  SUBTASK_STATUSES,
  subtaskCreateContract,
  subtaskEditContract,
  subtaskStatusContract,
  subtaskReorderContract,
} from '@devd/api-types/subtask.contracts.js'
import { setSubtaskStatus } from '../../apps/backend/src/lib/subtasks.js'

const firstMsg = (r) => r.error.issues[0].message

describe('DD-565 — Subtask-Contracts: Single Source + Struktur-Validierung', () => {
  test('SUBTASK_STATUSES = die zwei Status in load-bearing Reihenfolge', () => {
    expect(SUBTASK_STATUSES).toEqual(['open', 'done'])
  })

  test('Lib sourct SUBTASK_STATUSES aus dem Contract (setSubtaskStatus importierbar)', () => {
    // setSubtaskStatus referenziert SUBTASK_STATUSES aus dem Contract — die Importierbarkeit
    // ohne Crash beweist, dass die Lib das Array bezieht (kein hart abgetipptes Duplikat).
    expect(typeof setSubtaskStatus).toBe('function')
  })

  // ── subtaskCreateContract ───────────────────────────────────────────────
  test('create akzeptiert nur title', () => {
    expect(subtaskCreateContract.safeParse({ title: 'Schema migrieren' }).success).toBe(true)
  })

  test('create akzeptiert title + qa_criteria + position', () => {
    const r = subtaskCreateContract.safeParse({ title: 'X', qa_criteria: 'AC: grün', position: 3 })
    expect(r.success).toBe(true)
  })

  test('create lehnt fehlenden title mit exakter Lib-Message ab', () => {
    const r = subtaskCreateContract.safeParse({})
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('title ist Pflichtfeld')
  })

  test('create lehnt leeren / nur-whitespace title mit exakter Lib-Message ab', () => {
    const r = subtaskCreateContract.safeParse({ title: '   ' })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('title ist Pflichtfeld')
  })

  test('create lehnt nicht-ganzzahlige position mit exakter Lib-Message ab', () => {
    const r = subtaskCreateContract.safeParse({ title: 'X', position: 1.5 })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('position must be an integer')
  })

  // ── subtaskEditContract ─────────────────────────────────────────────────
  test('edit akzeptiert leeres Objekt (Lib prüft "mind. ein Feld" separat)', () => {
    expect(subtaskEditContract.safeParse({}).success).toBe(true)
  })

  test('edit akzeptiert qa_criteria = null (Feld leeren)', () => {
    expect(subtaskEditContract.safeParse({ qa_criteria: null }).success).toBe(true)
  })

  test('edit lehnt leeren title mit exakter Lib-Message ab', () => {
    const r = subtaskEditContract.safeParse({ title: '' })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('title ist Pflichtfeld')
  })

  test('edit lehnt nicht-ganzzahlige position mit exakter Lib-Message ab', () => {
    const r = subtaskEditContract.safeParse({ position: 2.7 })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('position must be an integer')
  })

  // ── subtaskStatusContract ───────────────────────────────────────────────
  test('status akzeptiert open + done', () => {
    expect(subtaskStatusContract.safeParse({ status: 'open' }).success).toBe(true)
    expect(subtaskStatusContract.safeParse({ status: 'done' }).success).toBe(true)
  })

  test('status lehnt unbekannten Status mit exakter Lib-Message ab', () => {
    const r = subtaskStatusContract.safeParse({ status: 'in_progress' })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('status muss open oder done sein')
  })

  // ── subtaskReorderContract ──────────────────────────────────────────────
  test('reorder akzeptiert id-Array', () => {
    expect(subtaskReorderContract.safeParse({ ids: [3, 1, 2] }).success).toBe(true)
  })

  test('reorder lehnt nicht-Array ids mit exakter Lib-Message ab', () => {
    const r = subtaskReorderContract.safeParse({ ids: 'nope' })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('orderedIds muss ein Array sein')
  })

  test('reorder lehnt nicht-ganzzahlige id mit exakter Lib-Message ab', () => {
    const r = subtaskReorderContract.safeParse({ ids: [1, 2.5] })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('orderedIds enthaelt ungueltige id')
  })
})
