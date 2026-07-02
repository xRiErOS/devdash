#!/usr/bin/env node
/**
 * gen-client.mjs — Client-Func-Emitter (DD2-204)
 *
 * Emittiert apps/cli-go/internal/api/generated.go (`package api`): je generierbarem
 * MCP-Tool eine Methode `func (c *Client) <D06-Name>(args generated.<D06-Name>Args)
 * (json.RawMessage, error)`, die method/path/query/body aus dem DD2-203-Parser
 * (handler-parser.mjs) in echten Go-Transport-Code übersetzt — c.Do als gemeinsamer
 * Transport, ResolveIssueID/ResolveSprintID für resolveIssueId/resolveSprintId-Rollen.
 *
 * `package api` (nicht `generated`): nur im Package des Typs `Client` dürfen ihm
 * Methoden hinzugefügt werden. Der Datentyp-Layer (`generated.<Name>Args`) bleibt
 * package-isoliert (D01 DD2#34); dieser Emitter importiert ihn nur.
 *
 * Result-Typ bewusst `json.RawMessage` (nicht ein per-Tool-Struct): die Zod-Shapes
 * liefern nur Input-Schemas, keine Output-Schemas — Response-Typing ist außerhalb
 * dieses Sprints (Call-Site-Migration DD2#36 typisiert am Ort des Bedarfs).
 *
 *   node apps/cli-go/codegen/gen-client.mjs
 *
 * Out-of-Scope: manual.go für die Skip-Liste (DD2#36), Freshness-Gate (DD2#37).
 */
import { execFileSync } from 'child_process'
import { writeFileSync, readFileSync, readdirSync } from 'fs'
import { dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'
import { introspect } from './introspect.mjs'
import { shapeToJsonSchema } from './capabilities.mjs'
import { mapSchema, needsPointer, pascalCase, goToolName } from './typemap.mjs'
import { analyzeHandler } from './handler-parser.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_DIR = join(__dirname, '..', 'internal', 'api')
const OUT_FILE = join(API_DIR, 'generated.go')

/**
 * Namen, die bereits als Hand-Methode auf *Client existieren (irgendeine .go-Datei in
 * internal/api/ außer generated.go selbst). Verhindert `method already declared`, wenn
 * ein hand-codierter Helfer zufällig denselben D06-Namen trägt wie ein generierbares Tool
 * (z.B. review.go SprintRevResults/SprintCompleteness) — Konsolidierung ist DD2#36-Scope.
 */
export function existingClientMethodNames() {
  const names = new Set()
  for (const file of readdirSync(API_DIR)) {
    if (!file.endsWith('.go') || file === basename(OUT_FILE) || file.endsWith('_test.go')) continue
    const src = readFileSync(join(API_DIR, file), 'utf8')
    for (const m of src.matchAll(/func \(c \*Client\) (\w+)\(/g)) names.add(m[1])
  }
  return names
}

function countApiRequestCalls(src) {
  const m = src.match(/apiRequest\(/g)
  return m ? m.length : 0
}

/** Top-Level-Zod-Feld → { goField, kind, goType, pointer } (dieselbe Quelle wie gen-types.mjs). */
export function fieldInfoMap(tool) {
  const schema = shapeToJsonSchema(tool.zodShape)
  const obj = mapSchema(schema, true)
  const map = new Map()
  for (const key of Object.keys(obj.fields || {})) {
    const fd = obj.fields[key]
    map.set(key, { goField: pascalCase(key), kind: fd.kind, goType: fd.goType, pointer: needsPointer(fd) })
  }
  return map
}

function goStringLiteral(s) {
  return JSON.stringify(String(s))
}

function goLiteralValue(v) {
  if (typeof v === 'string') return goStringLiteral(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return goStringLiteral(String(v))
}

function unwrapCast(sym) {
  let s = sym
  while (s && s.kind === 'cast') s = s.inner
  return s
}

function zeroValue(fi) {
  if (fi.kind === 'scalar' && fi.goType === 'string') return '""'
  if (fi.kind === 'scalar' && fi.goType === 'int') return '0'
  if (fi.kind === 'scalar' && fi.goType === 'float64') return '0'
  return 'nil'
}

/** Stringifiziert einen (bereits dereferenzierten) Args-Feldzugriff für Pfad/Query. */
function stringifyArg(fi) {
  const raw = fi.pointer ? `*args.${fi.goField}` : `args.${fi.goField}`
  if (fi.kind === 'scalar' && fi.goType === 'string') return raw
  if (fi.kind === 'enum') return `string(${raw})`
  return `fmt.Sprintf("%v", ${raw})`
}

/** Boolesche Guard-Bedingung für ein Args-Feld (Pointer-Check bzw. Truthy je Typ). */
function guardCondExpr(fi) {
  if (fi.pointer) {
    if (fi.kind === 'scalar' && fi.goType === 'bool') return `args.${fi.goField} != nil && *args.${fi.goField}`
    return `args.${fi.goField} != nil`
  }
  if (fi.kind === 'scalar' && fi.goType === 'bool') return `args.${fi.goField}`
  return `args.${fi.goField} != ${zeroValue(fi)}`
}

function resolverVarName(kind, argName) {
  const base = pascalCase(argName)
  const lower = base.charAt(0).toLowerCase() + base.slice(1)
  return `${lower}${kind === 'resolvedIssue' ? 'IssueID' : 'SprintID'}`
}

/** Alle eindeutigen (kind,argName)-Resolver-Aufrufe, die irgendwo in path/query/body gebraucht werden. */
function collectResolvers(analysis) {
  const map = new Map()
  const visit = (sym) => {
    const base = unwrapCast(sym)
    if (base && (base.kind === 'resolvedIssue' || base.kind === 'resolvedSprint')) {
      map.set(`${base.kind}:${base.argName}`, base)
    }
  }
  for (const p of analysis.pathParts) {
    if (p.kind === 'resolvedIssue' || p.kind === 'resolvedSprint') map.set(`${p.kind}:${p.argName}`, p)
  }
  if (analysis.query) for (const q of analysis.query) visit(q.source)
  if (analysis.body && analysis.body.kind === 'fields') for (const f of analysis.body.fields) visit(f.source)
  return [...map.values()]
}

/** analysis.body.kind==='rest' → die konkrete Feldliste (alle Zod-Felder minus explizit destrukturierte). */
function restFields(analysis, fields) {
  const explicit = new Set(analysis.declaredNames)
  return [...fields.keys()].filter((k) => !explicit.has(k)).map((k) => ({ key: k, source: { kind: 'arg', name: k }, guardArg: null }))
}

function pathSegmentExpr(p, fields, resolverVarNames) {
  if (p.kind === 'lit') return { expr: goStringLiteral(p.text) }
  if (p.kind === 'pid') {
    const e = 'c.ProjectID()'
    return { expr: p.escape ? `url.PathEscape(${e})` : e }
  }
  if (p.kind === 'resolvedIssue' || p.kind === 'resolvedSprint') {
    const varName = resolverVarNames.get(`${p.kind}:${p.argName}`)
    return { expr: `fmt.Sprintf("%d", ${varName})` }
  }
  if (p.kind === 'arg') {
    const fi = fields.get(p.name)
    if (!fi) return { error: `path references unknown field ${p.name}` }
    if (fi.pointer) return { error: `path arg ${p.name} is optional (pointer) — unsafe to dereference` }
    if (fi.kind === 'object' || fi.kind === 'array') return { error: `path arg ${p.name} has unsupported kind ${fi.kind}` }
    const s = stringifyArg(fi)
    return { expr: p.escape ? `url.PathEscape(${s})` : s }
  }
  return { error: `unknown pathPart kind ${p.kind}` }
}

function buildQueryStatements(query, fields, resolverVarNames) {
  const lines = []
  for (const q of query) {
    const base = unwrapCast(q.source)
    let setCall
    if (base.kind === 'literal') {
      setCall = `q.Set(${goStringLiteral(q.key)}, ${goStringLiteral(String(base.value))})`
    } else if (base.kind === 'arg') {
      const fi = fields.get(base.name)
      if (!fi) return { error: `query field ${q.key} references unknown arg ${base.name}` }
      if (fi.kind === 'object' || fi.kind === 'array') return { error: `query field ${q.key} has unsupported kind ${fi.kind}` }
      setCall = `q.Set(${goStringLiteral(q.key)}, ${stringifyArg(fi)})`
    } else if (base.kind === 'resolvedIssue' || base.kind === 'resolvedSprint') {
      const varName = resolverVarNames.get(`${base.kind}:${base.argName}`)
      setCall = `q.Set(${goStringLiteral(q.key)}, fmt.Sprintf("%d", ${varName}))`
    } else if (base.kind === 'pid') {
      setCall = `q.Set(${goStringLiteral(q.key)}, c.ProjectID())`
    } else {
      return { error: `query field ${q.key} unsupported source kind ${base.kind}` }
    }
    // Pointer-Gating für arg-Quellen (nur wenn kein zusätzlicher Guard das schon abdeckt)
    if (base.kind === 'arg' && !q.guardArg) {
      const fi = fields.get(base.name)
      if (fi.pointer) {
        lines.push(`if ${guardCondExpr(fi)} {`, `\t${setCall}`, `}`)
        continue
      }
    }
    if (q.guardArg) {
      const gfi = fields.get(q.guardArg)
      if (!gfi) return { error: `query field ${q.key} references unknown guard ${q.guardArg}` }
      lines.push(`if ${guardCondExpr(gfi)} {`, `\t${setCall}`, `}`)
      continue
    }
    lines.push(setCall)
  }
  return { lines }
}

function buildBodyStatements(bodyFields, fields, resolverVarNames) {
  const lines = []
  for (const f of bodyFields) {
    const base = unwrapCast(f.source)
    let assign
    if (base.kind === 'literal') {
      if (base.value === undefined) continue
      assign = `body[${goStringLiteral(f.key)}] = ${goLiteralValue(base.value)}`
    } else if (base.kind === 'arg') {
      const fi = fields.get(base.name)
      if (!fi) return { error: `body field ${f.key} references unknown arg ${base.name}` }
      assign = `body[${goStringLiteral(f.key)}] = ${fi.pointer ? `*args.${fi.goField}` : `args.${fi.goField}`}`
    } else if (base.kind === 'resolvedIssue' || base.kind === 'resolvedSprint') {
      const varName = resolverVarNames.get(`${base.kind}:${base.argName}`)
      assign = `body[${goStringLiteral(f.key)}] = ${varName}`
    } else if (base.kind === 'pid') {
      assign = `body[${goStringLiteral(f.key)}] = c.ProjectID()`
    } else {
      return { error: `body field ${f.key} unsupported source kind ${base.kind}` }
    }
    if (base.kind === 'arg' && !f.guardArg) {
      const fi = fields.get(base.name)
      if (fi.pointer) {
        lines.push(`if ${guardCondExpr(fi)} {`, `\t${assign}`, `}`)
        continue
      }
    }
    if (f.guardArg) {
      let gfi = fields.get(f.guardArg)
      if (!gfi && (base.kind === 'resolvedIssue' || base.kind === 'resolvedSprint')) {
        // Guard referenziert keine Top-Level-Zod-Feld, sondern eine lokale Var, die den optionalen
        // Resolver-Aufruf spiegelt (`let sprintId = null; if (sprint_key) sprintId = ...; if (sprintId
        // !== null) body.sprint_id = sprintId`). Die eigentliche Gating-Bedingung ist "wurde der Resolver
        // aufgerufen" — identisch zur Optionalität des Resolver-Quell-Args selbst (DD2-207-Regression).
        gfi = fields.get(base.argName)
      }
      if (!gfi) return { error: `body field ${f.key} references unknown guard ${f.guardArg}` }
      lines.push(`if ${guardCondExpr(gfi)} {`, `\t${assign}`, `}`)
      continue
    }
    lines.push(assign)
  }
  return { lines }
}

/** emitTool(tool) → { ok:true, code } | { ok:false, reason } */
export function emitTool(tool) {
  const calls = countApiRequestCalls(tool.handlerSource)
  if (calls !== 1) return { ok: false, reason: `apiRequest call count = ${calls}` }
  const analysis = analyzeHandler(tool)
  if (!analysis.ok) return { ok: false, reason: analysis.reason }

  const fields = fieldInfoMap(tool)
  const resolvers = collectResolvers(analysis)
  const resolversUsedInPath = new Set(
    analysis.pathParts.filter((p) => p.kind === 'resolvedIssue' || p.kind === 'resolvedSprint').map((p) => `${p.kind}:${p.argName}`),
  )
  const resolverVarNames = new Map()
  const resolverLines = []
  if (resolvers.length > 0) resolverLines.push('var err error')
  for (const r of resolvers) {
    const fi = fields.get(r.argName)
    if (!fi) return { ok: false, reason: `resolver references unknown field ${r.argName}` }
    if (fi.kind === 'object' || fi.kind === 'array') return { ok: false, reason: `resolver arg ${r.argName} has unsupported kind ${fi.kind}` }
    const key = `${r.kind}:${r.argName}`
    if (fi.pointer && resolversUsedInPath.has(key)) {
      return { ok: false, reason: `resolver arg ${r.argName} is optional but used in the path — no safe unconditional path shape` }
    }
    const varName = resolverVarName(r.kind, r.argName)
    resolverVarNames.set(key, varName)
    const method = r.kind === 'resolvedIssue' ? 'ResolveIssueID' : 'ResolveSprintID'
    const raw = fi.pointer ? `*args.${fi.goField}` : `args.${fi.goField}`
    const argExpr = fi.kind === 'scalar' && fi.goType === 'string' ? raw : `fmt.Sprintf("%v", ${raw})`
    if (fi.pointer) {
      // Optionale Resolver-Quelle: nur auflösen, wenn gesetzt — Var bleibt sonst 0 (Zero-Value)
      // und wird ausschließlich innerhalb des korrespondierenden, ebenfalls Pointer-gegateten
      // Query-/Body-Codes gelesen (nie im Pfad, s. Check oben).
      resolverLines.push(
        `var ${varName} int`,
        `if args.${fi.goField} != nil {`,
        `\t${varName}, err = c.${method}(${argExpr})`,
        `\tif err != nil {`,
        `\t\treturn nil, err`,
        `\t}`,
        `}`,
      )
    } else {
      resolverLines.push(`${varName}, err := c.${method}(${argExpr})`, `if err != nil {`, `\treturn nil, err`, `}`)
    }
  }

  const segResults = analysis.pathParts.map((p) => pathSegmentExpr(p, fields, resolverVarNames))
  const segErr = segResults.find((s) => s.error)
  if (segErr) return { ok: false, reason: segErr.error }
  const pathExpr = segResults.map((s) => s.expr).join(' + ')

  let queryLines = []
  const hasQuery = !!(analysis.query && analysis.query.length)
  if (hasQuery) {
    const r = buildQueryStatements(analysis.query, fields, resolverVarNames)
    if (r.error) return { ok: false, reason: r.error }
    queryLines = r.lines
  }

  let bodyLines = []
  let bodyVar = 'nil'
  if (analysis.body) {
    const bodyFieldList = analysis.body.kind === 'rest' ? restFields(analysis, fields) : analysis.body.fields
    const r = buildBodyStatements(bodyFieldList, fields, resolverVarNames)
    if (r.error) return { ok: false, reason: r.error }
    bodyLines = r.lines
    bodyVar = 'body'
  }

  const goName = goToolName(tool.name)
  const argsType = `generated.${goName}Args`
  const lines = []
  lines.push(`// ${goName} entspricht MCP-Tool ${tool.name}.`)
  lines.push(`func (c *Client) ${goName}(args ${argsType}) (json.RawMessage, error) {`)
  for (const l of resolverLines) lines.push(`\t${l}`)
  if (hasQuery) {
    lines.push(`\tq := url.Values{}`)
    for (const l of queryLines) lines.push(`\t${l}`)
  }
  if (bodyVar === 'body') {
    lines.push(`\tbody := map[string]any{}`)
    for (const l of bodyLines) lines.push(`\t${l}`)
  }
  lines.push(`\tpath := ${pathExpr}`)
  if (hasQuery) {
    lines.push(`\tif len(q) > 0 {`, `\t\tpath += "?" + q.Encode()`, `\t}`)
  }
  lines.push(`\tdata, err := c.Do(${goStringLiteral(analysis.method)}, path, ${bodyVar})`)
  lines.push(`\tif err != nil {`, `\t\treturn nil, err`, `\t}`)
  lines.push(`\treturn json.RawMessage(data), nil`)
  lines.push(`}`)

  return { ok: true, code: lines.join('\n') }
}

export function generate(tools, existingNames = new Set()) {
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name))
  const funcs = []
  const skipped = []
  for (const t of sorted) {
    const goName = goToolName(t.name)
    if (existingNames.has(goName)) {
      skipped.push({ name: t.name, reason: `Go-Name ${goName} bereits hand-implementiert (Konsolidierung DD2#36)` })
      continue
    }
    const r = emitTool(t)
    if (r.ok) funcs.push(r.code)
    else skipped.push({ name: t.name, reason: r.reason })
  }
  const header = [
    '// Code generated by apps/cli-go/codegen/gen-client.mjs; DO NOT EDIT.',
    '//',
    '// Quelle: apps/cli/mcp/devd-mcp.js (via Introspektions-Harness DD2-199).',
    '// Ein Client-Func je Single-apiRequest-MCP-Tool (DD2-203 Handler-Parser, DD2-205 D06-Namen).',
    '// Nicht-generierbare Tools (multi-call / async Pfad-Resolution / Bulk-Business-Logic)',
    '// bleiben Handarbeit im Manual-Layer (DD2#36).',
    '// Regenerieren: node apps/cli-go/codegen/gen-client.mjs',
    '',
    'package api',
    '',
    'import (',
    '\t"encoding/json"',
    '\t"fmt"',
    '\t"net/url"',
    '',
    '\t"devd-cli/internal/api/generated"',
    ')',
  ].join('\n')
  const src = header + '\n\n' + funcs.join('\n\n') + '\n'
  return { src, okCount: funcs.length, skipped }
}

export async function emitClient() {
  const tools = await introspect()
  const { src, okCount, skipped } = generate(tools, existingClientMethodNames())
  writeFileSync(OUT_FILE, src)
  execFileSync('gofmt', ['-w', OUT_FILE])
  return { outFile: OUT_FILE, okCount, skipped }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { outFile, okCount, skipped } = await emitClient()
  console.log(`OK: ${okCount} Client-Funcs → ${outFile}`)
  console.log(`SKIP: ${skipped.length} Tools (Manual-Layer DD2#36):`)
  for (const s of skipped) console.log(`  ${s.name} → ${s.reason}`)
}
