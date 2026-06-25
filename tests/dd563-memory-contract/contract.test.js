import { describe, test, expect } from 'vitest'
import {
  MEMORY_CATEGORIES,
  memoryLogContract,
  memoryUpdateContract,
  memorySupersedeContract,
} from '../../contracts/project-memory.contracts.js'
import { CATEGORIES as LIB_CATEGORIES } from '../../server/lib/projectMemories.js'

// DD-563 (Sprint DD#78, Triplet 4/6): Contract spiegelt die Struktur-/Typ-/Required-
// Validierung der project-memories-Payloads (log/update/supersede). Die werfende
// Autorität + Anchor-Pattern/Uniqueness + FTS-Indexing bleiben in
// server/lib/projectMemories.js (getestet in tests/mem9-project-memory). Hier: Enum
// Single-Source + Struktur-Contracts.

describe('DD-563 MEMORY_CATEGORIES — Single Source mit der Lib', () => {
  test('MEMORY_CATEGORIES == Migration-041-Reihenfolge', () => {
    expect(MEMORY_CATEGORIES).toEqual([
      'architecture_decision',
      'dead_end',
      'bug_pattern',
      'convention',
      'external_constraint',
      'session_note',
    ])
  })
  test('Lib CATEGORIES leitet aus dem Contract ab (gleiche Werte + Reihenfolge)', () => {
    // Die Lib importiert MEMORY_CATEGORIES und re-exportiert es als frozen CATEGORIES.
    expect([...LIB_CATEGORIES]).toEqual(MEMORY_CATEGORIES)
    expect(Object.isFrozen(LIB_CATEGORIES)).toBe(true)
  })
})

describe('DD-563 memoryLogContract', () => {
  test('valid minimal (category + summary)', () => {
    const r = memoryLogContract.safeParse({ category: 'convention', summary: 'Foo' })
    expect(r.success).toBe(true)
  })
  test('summary trim', () => {
    const r = memoryLogContract.safeParse({ category: 'convention', summary: '   Foo   ' })
    expect(r.success).toBe(true)
    expect(r.data.summary).toBe('Foo')
  })
  test('valid voll (alle optionalen Felder)', () => {
    const r = memoryLogContract.safeParse({
      category: 'architecture_decision',
      summary: 'D01',
      content: 'Begründung',
      tags: ['a', 'b'],
      importance: 1,
      pinned: true,
      anchor: 'D01',
      stability: 'stable',
      source_type: 'chat',
      source_ref: 'sess-1',
    })
    expect(r.success).toBe(true)
  })
  test('tags als String akzeptiert (Lib normalizeTags)', () => {
    const r = memoryLogContract.safeParse({ category: 'convention', summary: 'x', tags: 'a b c' })
    expect(r.success).toBe(true)
  })
  test('category ungültig → Message exakt wie Lib', () => {
    const r = memoryLogContract.safeParse({ category: 'nonsense', summary: 'x' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe(
      `category muss eine von: ${MEMORY_CATEGORIES.join(', ')}`
    )
  })
  test('category fehlt → invalid', () => {
    const r = memoryLogContract.safeParse({ summary: 'x' })
    expect(r.success).toBe(false)
  })
  test('summary leer (nur Whitespace) → Message exakt wie Lib', () => {
    const r = memoryLogContract.safeParse({ category: 'convention', summary: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('summary darf nicht leer sein')
  })
  test('summary fehlt → invalid', () => {
    const r = memoryLogContract.safeParse({ category: 'convention' })
    expect(r.success).toBe(false)
  })
  test('summary > 500 Zeichen → Message exakt wie Lib', () => {
    const r = memoryLogContract.safeParse({ category: 'convention', summary: 'a'.repeat(501) })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('summary darf max 500 Zeichen lang sein')
  })
  test('importance außerhalb 1-3 → Message exakt wie Lib', () => {
    const r = memoryLogContract.safeParse({ category: 'convention', summary: 'x', importance: 4 })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe(
      'importance muss 1 (hoch), 2 (normal) oder 3 (niedrig) sein'
    )
  })
  test('stability ungültig → Message exakt wie Lib', () => {
    const r = memoryLogContract.safeParse({ category: 'convention', summary: 'x', stability: 'maybe' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe("stability muss 'stable' oder 'volatile' sein")
  })
})

describe('DD-563 memoryUpdateContract', () => {
  test('valid leer (alle Felder optional)', () => {
    expect(memoryUpdateContract.safeParse({}).success).toBe(true)
  })
  test('nur category', () => {
    expect(memoryUpdateContract.safeParse({ category: 'bug_pattern' }).success).toBe(true)
  })
  test('summary leer wenn gesetzt → invalid', () => {
    const r = memoryUpdateContract.safeParse({ summary: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('summary darf nicht leer sein')
  })
  test('category ungültig wenn gesetzt → invalid', () => {
    expect(memoryUpdateContract.safeParse({ category: 'nonsense' }).success).toBe(false)
  })
  test('content nullable (clear via null)', () => {
    expect(memoryUpdateContract.safeParse({ content: null }).success).toBe(true)
  })
})

describe('DD-563 memorySupersedeContract', () => {
  test('ist memoryUpdateContract (alle Felder optional)', () => {
    expect(memorySupersedeContract).toBe(memoryUpdateContract)
    expect(memorySupersedeContract.safeParse({}).success).toBe(true)
  })
})
