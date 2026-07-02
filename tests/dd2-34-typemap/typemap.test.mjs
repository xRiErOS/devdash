import { describe, it, expect } from 'vitest'
import { mapSchema, needsPointer, jsonTag, pascalCase, goToolName, SCALAR_MAP } from '../../apps/cli-go/codegen/typemap.mjs'

describe('DD2-201 Zod→Go-Typmapping', () => {
  it('mappt Skalare', () => {
    expect(mapSchema({ type: 'string' }, true)).toMatchObject({ kind: 'scalar', goType: 'string' })
    expect(mapSchema({ type: 'integer' }, true)).toMatchObject({ kind: 'scalar', goType: 'int' })
    expect(mapSchema({ type: 'number' }, true)).toMatchObject({ kind: 'scalar', goType: 'float64' })
    expect(mapSchema({ type: 'boolean' }, true)).toMatchObject({ kind: 'scalar', goType: 'bool' })
  })

  it('optional → Pointer + omitempty, required → Wert', () => {
    const req = mapSchema({ type: 'string' }, true)
    const opt = mapSchema({ type: 'string' }, false)
    expect(req.optional).toBe(false)
    expect(needsPointer(req)).toBe(false)
    expect(jsonTag('title', req)).toBe('title')
    expect(opt.optional).toBe(true)
    expect(needsPointer(opt)).toBe(true)
    expect(jsonTag('title', opt)).toBe('title,omitempty')
  })

  it('enum → const-Block-Descriptor (base string)', () => {
    const d = mapSchema({ type: 'string', enum: ['md', 'json', 'yaml'] }, false)
    expect(d).toMatchObject({ kind: 'enum', base: 'string', enumValues: ['md', 'json', 'yaml'] })
    expect(needsPointer(d)).toBe(true)
  })

  it('array → slice mit Element-Descriptor', () => {
    const d = mapSchema({ type: 'array', items: { type: 'string' } }, false)
    expect(d.kind).toBe('array')
    expect(d.elem).toMatchObject({ kind: 'scalar', goType: 'string' })
    // Slices sind nilbar → kein Pointer trotz optional
    expect(needsPointer(d)).toBe(false)
  })

  it('array von objects → []Sub-Struct', () => {
    const d = mapSchema(
      { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, priority: { type: 'integer' } }, required: ['title'] } },
      false,
    )
    expect(d.kind).toBe('array')
    expect(d.elem.kind).toBe('object')
    expect(d.elem.fields.title).toMatchObject({ kind: 'scalar', goType: 'string', optional: false })
    expect(d.elem.fields.priority).toMatchObject({ kind: 'scalar', goType: 'int', optional: true })
  })

  it('nested object → Sub-Struct mit required-Set', () => {
    const d = mapSchema(
      { type: 'object', properties: { a: { type: 'string' }, b: { type: 'boolean' } }, required: ['a'] },
      true,
    )
    expect(d.kind).toBe('object')
    expect(d.required).toEqual(['a'])
    expect(d.fields.a.optional).toBe(false)
    expect(d.fields.b.optional).toBe(true)
    // optionales nested object → Pointer (auch leere Sub-Struct)
    expect(needsPointer(mapSchema({ type: 'object', properties: {} }, false))).toBe(true)
  })

  it('anyOf[string,integer] (project_id-Union) → any', () => {
    const d = mapSchema({ anyOf: [{ type: 'string' }, { type: 'integer' }] }, false)
    expect(d).toMatchObject({ kind: 'any', goType: 'any' })
    // any ist interface → kein Pointer
    expect(needsPointer(d)).toBe(false)
  })

  it('anyOf[..., null] → nullable-Flag (single real type bleibt erhalten)', () => {
    const d = mapSchema({ anyOf: [{ type: 'string' }, { type: 'null' }] }, true)
    expect(d).toMatchObject({ kind: 'scalar', goType: 'string', nullable: true })
    expect(needsPointer(d)).toBe(true) // nullable trotz required
    expect(jsonTag('x', d)).toBe('x,omitempty')
  })

  it('Property nur mit description (z.any()) → any', () => {
    const d = mapSchema({ description: 'freeform payload' }, false)
    expect(d).toMatchObject({ kind: 'any', goType: 'any' })
  })

  it('pascalCase: snake/kebab/leading-digit', () => {
    expect(pascalCase('issue_create_full')).toBe('IssueCreateFull')
    expect(pascalCase('project-id')).toBe('ProjectId')
    expect(pascalCase('2fa_token')).toBe('_2faToken') // initiale Ziffer geschützt
    expect(pascalCase('id_or_key')).toBe('IdOrKey')
  })

  it('SCALAR_MAP deckt die vier Basistypen ab', () => {
    expect(Object.keys(SCALAR_MAP).sort()).toEqual(['boolean', 'integer', 'number', 'string'])
  })
})

describe('DD2-205 D06 Namensregel (goToolName)', () => {
  it('strippt devd_-Präfix und PascalCased den Rest', () => {
    expect(goToolName('devd_issue_create')).toBe('IssueCreate')
    expect(goToolName('devd_sprint_rev_results')).toBe('SprintRevResults')
  })

  it('deckungsgleich mit pascalCase(name ohne Präfix) — Single Source für types+func-Emitter', () => {
    expect(goToolName('devd_milestone_dod_set')).toBe(pascalCase('milestone_dod_set'))
  })

  it('keine Kollisionen über alle Tool-Namen mit devd_-Präfix', () => {
    const names = ['devd_issue_show', 'devd_issue_status', 'devd_sprint_show', 'devd_sprint_start']
    const goNames = names.map(goToolName)
    expect(new Set(goNames).size).toBe(names.length)
  })
})
