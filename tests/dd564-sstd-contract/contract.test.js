// DD-564 (Sprint DD#78, Triplet 5/6): SSTD-Slot-Payloads auf geteilten Zod-Contract.
// Beweist: (1) SLOT_KEYS + SLOT_LINE_OPS sind Single Source (Lib sourct sie aus dem Contract),
// (2) die Struktur-Contracts (slotSet/slotEdit/journalAdd) akzeptieren gültige + lehnen ungültige
// Payloads mit den EXAKTEN Lib-Messages ab (Verhalten 1:1). Die werfende Autorität bleibt in
// server/lib/sstdSlots.js — dieser Test pinnt nur den Contract als deckungsgleiche Zweit-Quelle.

import { describe, test, expect } from 'vitest'
import {
  SLOT_KEYS,
  SLOT_LINE_OPS,
  slotSetContract,
  slotEditContract,
  journalAddContract,
} from '../../contracts/sstd.contracts.js'
import { SLOT_KEYS as LIB_SLOT_KEYS } from '../../server/lib/sstdSlots.js'

const firstMsg = (r) => r.error.issues[0].message

describe('DD-564 — SSTD-Slot-Contracts: Single Source + Struktur-Validierung', () => {
  test('SLOT_KEYS = die sechs fixen Slots in load-bearing Reihenfolge', () => {
    expect(SLOT_KEYS).toEqual(['architecture', 'conventions', 'sprint_state', 'roadmap', 'cross_refs', 'misc'])
  })

  test('SLOT_LINE_OPS = die vier Line-Ops in load-bearing Reihenfolge', () => {
    expect(SLOT_LINE_OPS).toEqual(['patch', 'insert_after', 'insert_before', 'delete'])
  })

  test('Lib SLOT_KEYS ist aus dem Contract gesourct (deckungsgleich, value-equal)', () => {
    expect([...LIB_SLOT_KEYS]).toEqual([...SLOT_KEYS])
  })

  // ── slotSetContract ─────────────────────────────────────────────────────
  test('slotSet akzeptiert gültigen slot_key + content', () => {
    const r = slotSetContract.safeParse({ slot_key: 'roadmap', content: 'Q3-Ziele' })
    expect(r.success).toBe(true)
  })

  test('slotSet akzeptiert leeren content (Slot leeren)', () => {
    expect(slotSetContract.safeParse({ slot_key: 'misc', content: '' }).success).toBe(true)
  })

  test('slotSet lehnt unbekannten slot_key mit exakter Lib-Message ab', () => {
    const r = slotSetContract.safeParse({ slot_key: 'next_steps', content: 'x' })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('slot_key muss einer von: architecture, conventions, sprint_state, roadmap, cross_refs, misc')
  })

  test('slotSet lehnt nicht-String content mit exakter Lib-Message ab', () => {
    const r = slotSetContract.safeParse({ slot_key: 'misc', content: 42 })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('content muss ein String sein')
  })

  test('slotSet lehnt zu langen content mit exakter Lib-Message ab', () => {
    const r = slotSetContract.safeParse({ slot_key: 'misc', content: 'x'.repeat(64001) })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('content darf max 64000 Zeichen lang sein')
  })

  // ── slotEditContract ────────────────────────────────────────────────────
  test('slotEdit akzeptiert patch + line 1 + content', () => {
    const r = slotEditContract.safeParse({ slot_key: 'roadmap', op: 'patch', line: 1, content: 'neu' })
    expect(r.success).toBe(true)
  })

  test('slotEdit akzeptiert insert_after mit line 0 (voranstellen)', () => {
    expect(slotEditContract.safeParse({ slot_key: 'roadmap', op: 'insert_after', line: 0 }).success).toBe(true)
  })

  test('slotEdit akzeptiert optionalen expect-Guard', () => {
    expect(slotEditContract.safeParse({ slot_key: 'roadmap', op: 'delete', line: 2, expect: 'alt' }).success).toBe(true)
  })

  test('slotEdit lehnt unbekannten op mit exakter Lib-Message ab', () => {
    const r = slotEditContract.safeParse({ slot_key: 'roadmap', op: 'replace', line: 1 })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('op muss einer von: patch, insert_after, insert_before, delete')
  })

  test('slotEdit lehnt fehlende line ab', () => {
    const r = slotEditContract.safeParse({ slot_key: 'roadmap', op: 'patch' })
    expect(r.success).toBe(false)
  })

  test('slotEdit lehnt negative line mit exakter Message ab', () => {
    const r = slotEditContract.safeParse({ slot_key: 'roadmap', op: 'patch', line: -1 })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('line muss eine Ganzzahl sein')
  })

  test('slotEdit lehnt nicht-ganzzahlige line ab', () => {
    const r = slotEditContract.safeParse({ slot_key: 'roadmap', op: 'patch', line: 1.5 })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('line muss eine Ganzzahl sein')
  })

  // ── journalAddContract ──────────────────────────────────────────────────
  test('journalAdd akzeptiert non-empty text', () => {
    expect(journalAddContract.safeParse({ text: 'Heute MEM-16 begonnen' }).success).toBe(true)
  })

  test('journalAdd lehnt leeren / nur-whitespace text mit exakter Message ab', () => {
    const r = journalAddContract.safeParse({ text: '   ' })
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('text ist Pflichtfeld')
  })

  test('journalAdd lehnt fehlenden text mit exakter Message ab', () => {
    const r = journalAddContract.safeParse({})
    expect(r.success).toBe(false)
    expect(firstMsg(r)).toBe('text ist Pflichtfeld')
  })
})
