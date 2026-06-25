import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  getCaptureDefaultProjectId,
  setCaptureDefaultProjectId,
} from '../../src/lib/projectStore.js'

// DD-268 — localStorage-Helper für `capture-default-project-id`.
// Vitest läuft im Node-Env, daher muss localStorage gemockt werden.

describe('DD-268 — capture default project store', () => {
  let store

  beforeEach(() => {
    store = new Map()
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)) },
      removeItem: (k) => { store.delete(k) },
      clear: () => { store.clear() },
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size },
    }
  })

  afterEach(() => {
    delete globalThis.localStorage
  })

  test('initial state = null (kein Key)', () => {
    expect(getCaptureDefaultProjectId()).toBeNull()
  })

  test('set → get roundtrip persistiert numerische ID', () => {
    setCaptureDefaultProjectId(2)
    expect(getCaptureDefaultProjectId()).toBe(2)
    expect(store.get('capture-default-project-id')).toBe('2')
  })

  test('set akzeptiert String-Zahl', () => {
    setCaptureDefaultProjectId('5')
    expect(getCaptureDefaultProjectId()).toBe(5)
  })

  test('set lehnt 0, negative, NaN, non-numerisch ab (kein Key gesetzt)', () => {
    setCaptureDefaultProjectId(0)
    setCaptureDefaultProjectId(-3)
    setCaptureDefaultProjectId('abc')
    setCaptureDefaultProjectId(NaN)
    expect(getCaptureDefaultProjectId()).toBeNull()
  })

  test('set(null) löscht Key', () => {
    setCaptureDefaultProjectId(7)
    expect(getCaptureDefaultProjectId()).toBe(7)
    setCaptureDefaultProjectId(null)
    expect(getCaptureDefaultProjectId()).toBeNull()
    expect(store.has('capture-default-project-id')).toBe(false)
  })

  test('set(undefined) löscht Key', () => {
    setCaptureDefaultProjectId(3)
    setCaptureDefaultProjectId(undefined)
    expect(getCaptureDefaultProjectId()).toBeNull()
  })

  test('set("") löscht Key', () => {
    setCaptureDefaultProjectId(1)
    setCaptureDefaultProjectId('')
    expect(getCaptureDefaultProjectId()).toBeNull()
  })

  test('get ignoriert kaputte Werte', () => {
    store.set('capture-default-project-id', 'abc')
    expect(getCaptureDefaultProjectId()).toBeNull()
    store.set('capture-default-project-id', '-1')
    expect(getCaptureDefaultProjectId()).toBeNull()
  })

  test('Key ist getrennt von devd-active-project-id (AppShell-Scope)', () => {
    setCaptureDefaultProjectId(2)
    expect(store.has('devd-active-project-id')).toBe(false)
    expect(store.has('capture-default-project-id')).toBe(true)
  })

  test('localStorage-Fehler werden geschluckt (no throw)', () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('boom') },
      setItem: () => { throw new Error('boom') },
      removeItem: () => { throw new Error('boom') },
    }
    expect(() => setCaptureDefaultProjectId(2)).not.toThrow()
    expect(getCaptureDefaultProjectId()).toBeNull()
  })
})
