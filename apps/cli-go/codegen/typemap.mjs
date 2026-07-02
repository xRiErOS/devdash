#!/usr/bin/env node
/**
 * typemap.mjs — zentrale Zod(→JSONSchema)→Go-Typmapping-Schicht (DD2-201)
 *
 * Eine reine, testbare Mapping-Funktion `mapSchema` übersetzt ein JSONSchema-Property
 * (erzeugt von z.toJSONSchema, s. capabilities.mjs) in einen Go-Typ-Descriptor.
 * Der Emitter (DD2-202) rendert daraus Felder, Sub-Structs und enum-const-Blöcke.
 *
 * Regeln (Sprint-Goal):
 *   string  → string        integer → int          number  → float64
 *   boolean → bool          enum    → const-Block   nested  → Sub-Struct
 *   array   → slice         optional→ Pointer+omitempty
 *
 * Edge-Cases (an den echten 128 Schemas verifiziert):
 *   - anyOf[string,integer] (project_id-Union)      → any
 *   - anyOf[..., null] (nullable)                    → Pointer (nullable-Flag)
 *   - Property nur mit description (z.any())          → any
 *   - array.items = object                            → []<Sub-Struct>
 *   - array.items = anyOf-Union                       → []any
 *
 * Out-of-Scope: Func-/Transport-Emit (DD2#35), Datei-Emit (DD2-202).
 */

/** JSONSchema-Skalartyp → Go-Skalar. integer = int64-Range → Go `int`. */
export const SCALAR_MAP = {
  string: 'string',
  integer: 'int',
  number: 'float64',
  boolean: 'bool',
}

/**
 * mapSchema(schema, isRequired) → Descriptor (rein, rekursiv).
 *
 * Descriptor-Felder:
 *   kind        'scalar' | 'enum' | 'array' | 'object' | 'any'
 *   goType      Go-Typ-String für scalar/any (enum/array/object: null → Emitter benennt)
 *   optional    true, wenn der Key NICHT in `required` steht  → Pointer + omitempty
 *   nullable    true, wenn anyOf ein {type:null} enthielt       → Pointer
 *   enumValues  [..]            (kind 'enum')
 *   base        'string'        (kind 'enum' — Basistyp des const-Blocks)
 *   elem        Descriptor      (kind 'array' — Element-Descriptor)
 *   fields      {name:Descriptor} (kind 'object')
 *   required    [..]            (kind 'object' — required-Keys der Sub-Struct)
 *   description Roh-Beschreibung (für Doc-Kommentare)
 */
export function mapSchema(schema, isRequired) {
  const optional = !isRequired
  const description = (schema && schema.description) || ''
  let s = schema || {}
  let nullable = false

  // anyOf entfalten: null-Zweig = nullable; genau ein Real-Zweig = dessen Typ;
  // mehrere Real-Zweige = echte Union → any.
  if (Array.isArray(s.anyOf)) {
    const real = s.anyOf.filter((x) => x && x.type !== 'null')
    nullable = s.anyOf.some((x) => x && x.type === 'null')
    if (real.length === 1) {
      s = { description, ...real[0] }
    } else {
      return { kind: 'any', goType: 'any', optional, nullable, description }
    }
  }

  // enum (string-basiert) → const-Block
  if (Array.isArray(s.enum) && (s.type === 'string' || s.type === undefined)) {
    return { kind: 'enum', base: 'string', goType: null, enumValues: s.enum, optional, nullable, description }
  }

  // array → slice
  if (s.type === 'array') {
    const elem = mapSchema(s.items || {}, true) // Slice-Elemente sind in sich „required"
    return { kind: 'array', elem, goType: null, optional, nullable, description }
  }

  // object mit Properties → Sub-Struct
  if (s.type === 'object' && s.properties) {
    const req = new Set(s.required || [])
    const fields = {}
    for (const k of Object.keys(s.properties)) fields[k] = mapSchema(s.properties[k], req.has(k))
    return { kind: 'object', fields, required: [...req], goType: null, optional, nullable, description }
  }

  // Skalar
  const scalar = SCALAR_MAP[s.type]
  if (scalar) return { kind: 'scalar', goType: scalar, optional, nullable, description }

  // Property ohne Typ (z.any()) oder unrepräsentierbar → any
  return { kind: 'any', goType: 'any', optional, nullable, description }
}

/**
 * needsPointer(d) — Pointer nur für skalar/enum/object bei optional|nullable.
 * Slices (nil = leer) und any (interface, bereits nilbar) bleiben Wert-Typen.
 */
export function needsPointer(d) {
  if (!(d.optional || d.nullable)) return false
  return d.kind === 'scalar' || d.kind === 'enum' || d.kind === 'object'
}

/** omitempty, sobald optional oder nullable. */
export function jsonTag(name, d) {
  return d.optional || d.nullable ? `${name},omitempty` : name
}

/** snake_case / kebab → PascalCase Go-Identifier. Initiale Ziffer wird mit `_` geschützt. */
export function pascalCase(str) {
  const out = String(str)
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return /^[0-9]/.test(out) ? `_${out}` : out
}

/**
 * D06 (DD2-205): zentrale MCP-Tool-Name → Go-Name-Regel, von types- (Arg-Struct)
 * UND func-Emitter (DD2-204) gemeinsam genutzt — garantiert 1:1-Übereinstimmung
 * (kein show↔Get-Drift). devd_issue_create → IssueCreate.
 */
export function goToolName(mcpName) {
  return pascalCase(String(mcpName).replace(/^devd_/, ''))
}
