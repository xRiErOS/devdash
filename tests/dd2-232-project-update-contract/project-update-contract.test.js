import { describe, test, expect } from 'vitest'
import { projectUpdateContract, projectCreateContract } from '@devd/api-types/project.contracts.js'

// DD2-232: slug/prefix eines Projekts sind seit diesem Contract-Update auch nach
// der Anlage änderbar (vormals read-only, s. PUT /api/projects/:id in api.js).
// Der Update-Contract validiert das GLEICHE Format wie beim Create — Single
// Source (projectSlug/projectPrefix, project.contracts.js), hier nur die
// Optionalität + Format-Grenzen geprüft (Business-Regeln wie Reserved-Slug/
// UNIQUE-409 bleiben in api.js, dort nicht unit-testbar ohne Route-Harness).

describe('DD2-232 projectUpdateContract', () => {
  test('leerer Body OK (kein Feld angefasst)', () => {
    expect(projectUpdateContract.safeParse({}).success).toBe(true)
  })

  test('slug allein OK (a-z 0-9 -)', () => {
    expect(projectUpdateContract.safeParse({ slug: 'dd2-renamed' }).success).toBe(true)
  })

  test('slug mit Großbuchstaben/Sonderzeichen → invalid', () => {
    expect(projectUpdateContract.safeParse({ slug: 'DD2' }).success).toBe(false)
    expect(projectUpdateContract.safeParse({ slug: 'dd2_renamed' }).success).toBe(false)
    expect(projectUpdateContract.safeParse({ slug: 'dd2 renamed' }).success).toBe(false)
  })

  test('prefix allein OK (2-6 A-Z 0-9)', () => {
    expect(projectUpdateContract.safeParse({ prefix: 'DD3' }).success).toBe(true)
  })

  test('prefix zu kurz/lang/lowercase → invalid', () => {
    expect(projectUpdateContract.safeParse({ prefix: 'D' }).success).toBe(false)
    expect(projectUpdateContract.safeParse({ prefix: 'TOOLONG1' }).success).toBe(false)
    expect(projectUpdateContract.safeParse({ prefix: 'dd2' }).success).toBe(false)
  })

  test('slug+prefix zusammen OK', () => {
    const r = projectUpdateContract.safeParse({ slug: 'dd2-new', prefix: 'DD3' })
    expect(r.success).toBe(true)
    expect(r.data).toEqual({ slug: 'dd2-new', prefix: 'DD3' })
  })

  test('gleiches Format wie projectCreateContract (Single Source)', () => {
    // Ein Wert, der beim Create durchfällt, muss auch beim Update durchfallen.
    const bad = { slug: 'Not Valid!' }
    expect(projectCreateContract.safeParse({ ...bad, name: 'x', prefix: 'AB' }).success).toBe(false)
    expect(projectUpdateContract.safeParse(bad).success).toBe(false)
  })
})
