import { describe, test, expect } from 'vitest'
import {
  TODO_STATUSES,
  TODO_LINK_TYPES,
  todoCreateContract,
  todoUpdateContract,
  todoLinkContract,
} from '@devd/api-types/todo.contracts.js'
import { TODO_STATUSES as LIB_TODO_STATUSES } from '../../apps/backend/src/lib/projectTodos.js'
import { LINK_TYPES as LIB_LINK_TYPES } from '../../apps/backend/src/lib/projectTodoLinks.js'

// DD-562 (Sprint DD#78, Triplet 3/6): Contract spiegelt die Struktur-/Typ-/Required-
// Validierung der project-todos + todo-links-Payloads. Die werfende Autorität +
// typ-spezifische target-Validierung bleiben in server/lib/projectTodos.js +
// projectTodoLinks.js (getestet in tests/m03-s01). Hier: Enums Single-Source + Contracts.

describe('DD-562 Enums — Single Source mit der Lib', () => {
  test('TODO_STATUSES == lib TODO_STATUSES (gleiche Werte + Reihenfolge)', () => {
    expect(TODO_STATUSES).toEqual(['open', 'done', 'cancelled'])
    // Lib baut ihren Set aus exakt diesem Array → Identität der Werte + Reihenfolge.
    expect([...LIB_TODO_STATUSES]).toEqual(TODO_STATUSES)
  })
  test('TODO_LINK_TYPES == lib LINK_TYPES (gleiche Werte + Reihenfolge)', () => {
    expect(TODO_LINK_TYPES).toEqual(['spec', 'issue', 'vault', 'url'])
    expect([...LIB_LINK_TYPES]).toEqual(TODO_LINK_TYPES)
  })
})

describe('DD-562 todoCreateContract', () => {
  test('valid minimal', () => {
    expect(todoCreateContract.safeParse({ label: 'Foo' }).success).toBe(true)
  })
  test('label trim', () => {
    const r = todoCreateContract.safeParse({ label: '   Foo   ' })
    expect(r.success).toBe(true)
    expect(r.data.label).toBe('Foo')
  })
  test('label fehlt → Message exakt wie Lib', () => {
    const r = todoCreateContract.safeParse({})
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('label ist Pflichtfeld')
  })
  test('label leer/whitespace → "darf nicht leer" (Message)', () => {
    const r = todoCreateContract.safeParse({ label: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('label darf nicht leer sein')
  })
  test('label > 280 → TOO_LONG (Message wie Lib)', () => {
    const r = todoCreateContract.safeParse({ label: 'x'.repeat(281) })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('label darf max 280 Zeichen lang sein')
  })
  test('details optional + nullable', () => {
    expect(todoCreateContract.safeParse({ label: 'L', details: 'd' }).success).toBe(true)
    expect(todoCreateContract.safeParse({ label: 'L', details: null }).success).toBe(true)
  })
  test('details > 8000 → TOO_LONG (Message wie Lib)', () => {
    const r = todoCreateContract.safeParse({ label: 'L', details: 'x'.repeat(8001) })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('details darf max 8000 Zeichen lang sein')
  })
})

describe('DD-562 todoUpdateContract', () => {
  test('leerer Body OK (alle Felder optional)', () => {
    expect(todoUpdateContract.safeParse({}).success).toBe(true)
  })
  test('label non-empty wenn gesetzt (Message)', () => {
    const r = todoUpdateContract.safeParse({ label: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('label darf nicht leer sein')
  })
  test('status ∈ Enum', () => {
    expect(todoUpdateContract.safeParse({ status: 'done' }).success).toBe(true)
    expect(todoUpdateContract.safeParse({ status: 'cancelled' }).success).toBe(true)
  })
  test('status invalid → "status muss einer von …" (Message-Anker)', () => {
    const r = todoUpdateContract.safeParse({ status: 'archived' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toMatch(/status muss einer von/)
    expect(r.error.issues[0].message).toBe('status muss einer von [open, done, cancelled] sein')
  })
  test('details = null erlaubt (clear-Pfad wie patchTodo)', () => {
    expect(todoUpdateContract.safeParse({ details: null }).success).toBe(true)
  })
})

describe('DD-562 todoLinkContract', () => {
  test('alle 4 Typen valid', () => {
    for (const type of TODO_LINK_TYPES) {
      expect(todoLinkContract.safeParse({ type, target: 'x' }).success).toBe(true)
    }
  })
  test('type invalid → "type muss einer von …" (Message-Anker)', () => {
    const r = todoLinkContract.safeParse({ type: 'blog', target: 'x' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toMatch(/type muss einer von/)
    expect(r.error.issues[0].message).toBe('type muss einer von [spec, issue, vault, url] sein')
  })
  test('target Pflicht (fehlt) → Message', () => {
    const r = todoLinkContract.safeParse({ type: 'url' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('target ist Pflichtfeld')
  })
  test('target leer/whitespace → Message', () => {
    const r = todoLinkContract.safeParse({ type: 'url', target: '   ' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('target ist Pflichtfeld')
  })
  test('target > 2000 → TOO_LONG (Message wie Lib)', () => {
    const r = todoLinkContract.safeParse({ type: 'url', target: 'x'.repeat(2001) })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('target darf max 2000 Zeichen lang sein')
  })
})
