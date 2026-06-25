import { describe, test, expect } from 'vitest'
import { parseRef } from '../../contracts/keys.js'

describe('DD-611 parseRef — tolerante Schreibweisen', () => {
  test('numerische Roh-ID', () => {
    expect(parseRef('77')).toEqual({ id: 77 })
    expect(parseRef(77)).toEqual({ id: 77 })
  })

  test('Sprint-Key DD#77', () => {
    expect(parseRef('DD#77')).toEqual({ prefix: 'DD', number: 77 })
  })

  test('Issue-Key DD-557', () => {
    expect(parseRef('DD-557')).toEqual({ prefix: 'DD', number: 557 })
  })

  test('Kleinschreibung dd-77 → DD', () => {
    expect(parseRef('dd-77')).toEqual({ prefix: 'DD', number: 77 })
  })

  test('ohne Separator dd77 → prefix dd + 77 (nicht dd7/7)', () => {
    expect(parseRef('dd77')).toEqual({ prefix: 'DD', number: 77 })
  })

  test('mehrbuchstabiger Prefix ohne Separator MBT42', () => {
    expect(parseRef('MBT42')).toEqual({ prefix: 'MBT', number: 42 })
    expect(parseRef('mbt-42')).toEqual({ prefix: 'MBT', number: 42 })
    expect(parseRef('MBT#42')).toEqual({ prefix: 'MBT', number: 42 })
  })

  test('prefix-los #77 (Sprint bare)', () => {
    expect(parseRef('#77')).toEqual({ number: 77 })
  })

  test('Reject: leer / null / Unsinn', () => {
    expect(parseRef(null)).toBeNull()
    expect(parseRef(undefined)).toBeNull()
    expect(parseRef('')).toBeNull()
    expect(parseRef('   ')).toBeNull()
    expect(parseRef('abc')).toBeNull()
    expect(parseRef('DD-')).toBeNull()
    expect(parseRef('#')).toBeNull()
  })

  // DD-611-Review (🔴): ohne Separator nur Buchstaben-Prefix — "A77" (Buchstabe+Ziffern
  // ohne Trenner) ist mehrdeutig (A7+7 vs A+77) und wird bewusst abgelehnt; mit Separator OK.
  test('Review-Fix: A77 ohne Separator → null (mehrdeutig, kein realer Prefix)', () => {
    expect(parseRef('A77')).toBeNull()
  })

  test('Review-Fix: Ziffern-Prefix nur MIT Separator (A1-5)', () => {
    expect(parseRef('A1-5')).toEqual({ prefix: 'A1', number: 5 })
    expect(parseRef('A1#5')).toEqual({ prefix: 'A1', number: 5 })
  })

  test('Whitespace wird getrimmt', () => {
    expect(parseRef('  DD#77  ')).toEqual({ prefix: 'DD', number: 77 })
  })

  test('6-stelliger Prefix (DWIKI)', () => {
    expect(parseRef('DWIKI-3')).toEqual({ prefix: 'DWIKI', number: 3 })
  })
})
