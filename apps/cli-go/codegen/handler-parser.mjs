#!/usr/bin/env node
/**
 * handler-parser.mjs — apiRequest-Handler-Analyse (DD2-203)
 *
 * Analysiert den Quelltext eines MCP-Tool-Handlers (`handlerSource` aus introspect.mjs)
 * und extrahiert method/path/query/body für Tools mit GENAU einem `apiRequest(...)`-Call.
 * AST-basiert (acorn) statt Regex — der Handler-Code ist zu variantenreich für zuverlässiges
 * String-Matching (Template-Literale, URLSearchParams, resolveIssueId/resolveSprintId, ...).
 *
 * `analyzeHandler({name, handlerSource, declaredParams})` → entweder
 *   { ok: true, method, pathParts, query, body }
 * oder
 *   { ok: false, reason }  — Tool bleibt Handarbeit (DD2#36 Manual-Layer)
 *
 * pathParts: Array<
 *   | { kind: 'lit', text }
 *   | { kind: 'arg', name, escape }
 *   | { kind: 'resolvedIssue', argName, escape }
 *   | { kind: 'resolvedSprint', argName, escape }
 *   | { kind: 'pid', escape }
 * >
 * query: Array<{ key, source: SymVal, guardArg: string|null }>  (guardArg = bool-Flag-Gate, sonst null = Schema-Optionalität gated)
 * body:
 *   | null
 *   | { kind: 'rest', restName }                                 — alle Nicht-destrukturierten Felder
 *   | { kind: 'fields', fields: Array<{ key, source: SymVal }> } — explizite Objekt-Felder
 *
 * SymVal (Werte-Quelle für query/body):
 *   { kind: 'arg', name }
 *   | { kind: 'resolvedIssue', argName }
 *   | { kind: 'resolvedSprint', argName }
 *   | { kind: 'pid' }
 *   | { kind: 'literal', value }
 *   | { kind: 'cast', cast: 'Number'|'String'|'Boolean', inner: SymVal }
 *
 * Bewusst konservativ: jede nicht katalogisierte Form (docOwnerBase, if/else-Branching
 * auf unterschiedliche Literal-Werte, unbekannte Funktionsaufrufe, ...) → { ok:false }.
 * Out-of-Scope: Emit (DD2-204), Namensregel (DD2-205), multi-apiRequest-Tools (DD2#36).
 */
import { parseExpressionAt } from 'acorn'

const RESOLVERS = { resolveIssueId: 'resolvedIssue', resolveSprintId: 'resolvedSprint' }
const CASTS = new Set(['Number', 'String', 'Boolean'])

function unsupported(reason) {
  return { kind: 'unsupported', reason }
}

function isUnsupported(v) {
  return !v || v.kind === 'unsupported'
}

/** Parst die Funktions-Params (ObjectPattern) → { declaredNames, restName }. */
function parseParams(fn) {
  const declaredNames = []
  let restName = null
  const p = fn.params[0]
  if (!p) return { declaredNames, restName, renames: [] }
  if (p.type !== 'ObjectPattern') return { declaredNames, restName, error: 'non-object param' }
  const renames = [] // { jsonKey, localName } für umbenannte Destrukturierung ({ old: oldTag })
  for (const prop of p.properties) {
    if (prop.type === 'RestElement') {
      restName = prop.argument.name
      continue
    }
    const jsonKey = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value
    const localName = prop.value.type === 'Identifier' ? prop.value.name : jsonKey
    declaredNames.push(jsonKey)
    renames.push({ jsonKey, localName })
  }
  return { declaredNames, restName, renames }
}

/** Statements aus Arrow-Body (BlockStatement oder implizites Return-Expr). */
function bodyStatements(fn) {
  if (fn.body.type === 'BlockStatement') return fn.body.body
  return [{ type: 'ReturnStatement', argument: fn.body }]
}

/** unwrap encodeURIComponent/String/Number/Boolean/await — liefert { inner, escape, cast }. */
function unwrapCalls(node) {
  let escape = false
  let cast = null
  let n = node
  for (;;) {
    if (n.type === 'AwaitExpression') {
      n = n.argument
      continue
    }
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier') {
      if (n.callee.name === 'encodeURIComponent' && n.arguments.length === 1) {
        escape = true
        n = n.arguments[0]
        continue
      }
      if (CASTS.has(n.callee.name) && n.arguments.length === 1) {
        cast = n.callee.name
        n = n.arguments[0]
        continue
      }
    }
    break
  }
  return { inner: n, escape, cast }
}

function applyCastEscape(sym, cast, escape) {
  if (isUnsupported(sym)) return sym
  const out = cast ? { kind: 'cast', cast, inner: sym } : sym
  if (escape) out.escape = true
  return out
}

/** Wertet einen Ausdruck symbolisch aus (Identifier/Literal/Resolver-Call/...). */
function evalExpr(node, env) {
  const { inner, escape, cast } = unwrapCalls(node)
  if (inner.type === 'Identifier') {
    const v = env.get(inner.name)
    if (v === undefined) {
      if (inner.name === 'undefined') return applyCastEscape({ kind: 'literal', value: undefined }, cast, escape)
      return unsupported(`unknown identifier ${inner.name}`)
    }
    return applyCastEscape(v, cast, escape)
  }
  if (inner.type === 'Literal') {
    return applyCastEscape({ kind: 'literal', value: inner.value }, cast, escape)
  }
  if (inner.type === 'CallExpression' && inner.callee.type === 'Identifier' && RESOLVERS[inner.callee.name]) {
    let argSym = evalExpr(inner.arguments[0], env)
    while (argSym && argSym.kind === 'cast') argSym = argSym.inner // z.B. resolveIssueId(String(x), pid)
    if (isUnsupported(argSym) || argSym.kind !== 'arg') return unsupported(`resolver arg not a plain declared param`)
    return applyCastEscape({ kind: RESOLVERS[inner.callee.name], argName: argSym.name }, cast, escape)
  }
  if (inner.type === 'CallExpression' && inner.callee.type === 'Identifier' && inner.callee.name === 'resolveProjectId') {
    return applyCastEscape({ kind: 'pid' }, cast, escape)
  }
  if (inner.type === 'NewExpression' && inner.callee.name === 'URLSearchParams') {
    const urlParams = { kind: 'urlParams', sets: [] }
    if (inner.arguments.length === 1 && inner.arguments[0].type === 'ObjectExpression') {
      const obj = evalObjectExpression(inner.arguments[0], env)
      if (isUnsupported(obj)) return obj
      for (const f of obj.fields) urlParams.sets.push({ key: f.key, value: f.source })
    }
    return urlParams
  }
  if (inner.type === 'ObjectExpression') {
    return evalObjectExpression(inner, env)
  }
  if (inner.type === 'ConditionalExpression') {
    return evalConditionalQs(inner, env)
  }
  return unsupported(`unhandled expr type ${inner.type}`)
}

/** Inline `{ a, b: expr, c: 'literal' }` → { kind:'object', fields:[{key,source}] }. */
function evalObjectExpression(node, env) {
  const fields = []
  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement') return unsupported('spread in object literal')
    const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value
    const source = prop.shorthand ? evalExpr(prop.key, env) : evalExpr(prop.value, env)
    if (isUnsupported(source)) return source
    fields.push({ key, source, guardArg: null }) // Objekt-Literal selbst hat keinen umschließenden if-Guard
  }
  return { kind: 'object', fields }
}

/**
 * Zwei bekannte Ternary-Qs-Idiome, normalisiert auf { kind:'urlParams', sets:[...] }:
 *   a) `params.toString() ? \`?${params.toString()}\` : ''`  → durchreichen des urlParams-Envs
 *   b) `x ? \`?key=${expr}\` : ''`                            → synthetisches einzelnes Set
 */
function evalConditionalQs(node, env) {
  const isEmptyStringAlt = node.alternate.type === 'Literal' && node.alternate.value === ''
  if (!isEmptyStringAlt) return unsupported('conditional with non-empty-string alternate')
  if (
    node.test.type === 'CallExpression' &&
    node.test.callee.type === 'MemberExpression' &&
    node.test.callee.property.name === 'toString' &&
    node.consequent.type === 'TemplateLiteral'
  ) {
    const baseName = node.test.callee.object.name
    const base = env.get(baseName)
    if (base && base.kind === 'urlParams') return base
    return unsupported('toString ternary base not urlParams')
  }
  if (node.consequent.type === 'TemplateLiteral') {
    const tpl = node.consequent
    if (tpl.quasis.length !== 2 || tpl.expressions.length !== 1) return unsupported('qs ternary template shape')
    const prefix = tpl.quasis[0].value.cooked // e.g. "?status="
    const m = /^\?([A-Za-z0-9_]+)=$/.exec(prefix)
    if (!m) return unsupported('qs ternary prefix shape')
    const value = evalExpr(tpl.expressions[0], env)
    if (isUnsupported(value)) return value
    return { kind: 'urlParams', sets: [{ key: m[1], value }] }
  }
  return unsupported('conditional qs shape')
}

/** `X.set(key, value)` — key muss String-Literal sein. */
function processUrlParamsSet(callExpr, env) {
  const objName = callExpr.callee.object.name
  const urlParams = env.get(objName)
  if (!urlParams || urlParams.kind !== 'urlParams') return null // nicht unser Muster, ignorieren
  const keyNode = callExpr.arguments[0]
  if (keyNode.type !== 'Literal' || typeof keyNode.value !== 'string') {
    urlParams.sets.push(unsupported('params.set key not literal'))
    return true
  }
  const value = evalExpr(callExpr.arguments[1], env)
  urlParams.sets.push({ key: keyNode.value, value, guardArg: currentGuard() })
  return true
}

/** `bodyVar.key = value` — bodyVar muss env-Objekt sein. */
function processObjectAssign(assignExpr, env) {
  if (assignExpr.left.type !== 'MemberExpression') return null
  const objName = assignExpr.left.object.name
  const obj = env.get(objName)
  if (!obj || obj.kind !== 'object') return null
  const key = assignExpr.left.property.name
  const value = evalExpr(assignExpr.right, env)
  obj.fields.push({ key, source: value, guardArg: currentGuard() })
  return true
}

let sawElseBranch = false
let guardStack = []
function currentGuard() {
  return guardStack.length ? guardStack[guardStack.length - 1] : null
}

/** Sammelt alle Identifier-Namen in einem Ausdruck (rekursiv, ohne AST-Typ-Kenntnis vorauszusetzen). */
function collectIdentifiers(node, out) {
  if (!node || typeof node !== 'object') return
  if (node.type === 'Identifier' && node.name !== 'undefined' && node.name !== 'null') out.add(node.name)
  for (const key of Object.keys(node)) {
    if (key === 'type') continue
    const v = node[key]
    if (Array.isArray(v)) v.forEach((x) => collectIdentifiers(x, out))
    else if (v && typeof v.type === 'string') collectIdentifiers(v, out)
  }
}

/**
 * Guard-Identifier einer if-Bedingung, wenn GENAU EIN Bezeichner referenziert wird
 * (`if (x)`, `if (x !== undefined)`, `if (x !== undefined && x !== null)`, ...).
 * Mehrdeutige/mehr-Bezeichner-Bedingungen → null (kein Guard erfasst, bewusst konservativ:
 * betrifft dann nur literal-wertige Felder, die OHNE erfassten Guard unconditional emittiert
 * würden — solche Sonderfälle sollen aus dem Coverage-Report auffallen, nicht dieses ganze
 * Tool blockieren).
 */
function singleGuardIdentifier(test) {
  const ids = new Set()
  collectIdentifiers(test, ids)
  return ids.size === 1 ? [...ids][0] : null
}

function walkStatements(stmts, env) {
  for (const stmt of stmts) walkStatement(stmt, env)
}

function walkStatement(stmt, env) {
  switch (stmt.type) {
    case 'VariableDeclaration':
      for (const d of stmt.declarations) {
        if (!d.init) continue
        env.set(d.id.name, evalExpr(d.init, env))
      }
      return
    case 'ExpressionStatement': {
      const e = stmt.expression
      if (e.type === 'CallExpression' && e.callee.type === 'MemberExpression' && e.callee.property.name === 'set') {
        processUrlParamsSet(e, env)
      } else if (e.type === 'AssignmentExpression') {
        processObjectAssign(e, env)
      }
      return
    }
    case 'IfStatement': {
      if (stmt.alternate) sawElseBranch = true
      const g = singleGuardIdentifier(stmt.test)
      if (g) guardStack.push(g)
      walkInner(stmt.consequent, env)
      if (g) guardStack.pop()
      if (stmt.alternate) walkInner(stmt.alternate, env)
      return
    }
    case 'BlockStatement':
      walkStatements(stmt.body, env)
      return
    default:
      return // Return/andere Statements ignorieren wir hier bewusst (s. Doku-Kommentar)
  }
}

function walkInner(node, env) {
  if (node.type === 'BlockStatement') walkStatements(node.body, env)
  else walkStatement(node, env)
}

/** Sucht rekursiv den (einzigen) `apiRequest(...)`-CallExpression-Node im Funktionskörper. */
function findApiRequestCall(node) {
  if (!node || typeof node !== 'object') return null
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'apiRequest') {
    return node
  }
  for (const key of Object.keys(node)) {
    if (key === 'type') continue
    const v = node[key]
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = findApiRequestCall(item)
        if (found) return found
      }
    } else if (v && typeof v.type === 'string') {
      const found = findApiRequestCall(v)
      if (found) return found
    }
  }
  return null
}

/** Template-Literal (Pfad) → pathParts + optionale eingebettete Query (qs-Var oder Inline-Ternary-Flag). */
function evalPathTemplate(tpl, env) {
  const pathParts = []
  let query = null
  for (let i = 0; i < tpl.quasis.length; i++) {
    const raw = tpl.quasis[i].value.cooked
    if (raw) pathParts.push({ kind: 'lit', text: raw })
    if (i < tpl.expressions.length) {
      const exprNode = tpl.expressions[i]
      const { inner, escape, cast } = unwrapCalls(exprNode)
      if (inner.type === 'Identifier' && inner.name === 'qs') {
        const qsVal = env.get('qs')
        if (!qsVal || qsVal.kind !== 'urlParams') return { error: 'qs placeholder unresolved' }
        query = qsVal.sets
        continue
      }
      if (inner.type === 'ConditionalExpression') {
        const r = evalInlineFlagQuery(inner, env)
        if (r.error) return r
        query = (query || []).concat(r.entries)
        continue
      }
      if (inner.type === 'CallExpression' && inner.callee.type === 'MemberExpression' && inner.callee.property.name === 'toString') {
        const up = env.get(inner.callee.object.name)
        if (up && up.kind === 'urlParams') {
          query = up.sets
          // vorangehendes Literal-Segment endet oft schon auf '?' (Template baut das '?' selbst) —
          // strippen, der Emitter hängt das '?' beim Query-Anfügen einheitlich selbst an.
          const last = pathParts[pathParts.length - 1]
          if (last && last.kind === 'lit' && last.text.endsWith('?')) last.text = last.text.slice(0, -1)
          continue
        }
      }
      let sym = evalExpr(exprNode, env) // evalExpr unwrapt Calls/Escape bereits selbst
      if (isUnsupported(sym)) return { error: sym.reason }
      // String()-Cast ist für Pfad-Segmente ein No-Op (Go stringifiziert ohnehin) — unwrappen,
      // Escape-Flag dabei nach außen tragen (kann auf dem cast-Wrapper ODER dem inneren Wert sitzen).
      let pathEscape = !!sym.escape
      while (sym.kind === 'cast') {
        pathEscape = pathEscape || !!sym.escape
        sym = sym.inner
      }
      if (sym.kind === 'arg') pathParts.push({ kind: 'arg', name: sym.name, escape: pathEscape })
      else if (sym.kind === 'resolvedIssue') pathParts.push({ kind: 'resolvedIssue', argName: sym.argName, escape: pathEscape })
      else if (sym.kind === 'resolvedSprint') pathParts.push({ kind: 'resolvedSprint', argName: sym.argName, escape: pathEscape })
      else if (sym.kind === 'pid') pathParts.push({ kind: 'pid', escape: pathEscape })
      else return { error: `unsupported path placeholder kind ${sym.kind}` }
    }
  }
  return { pathParts, query }
}

/** `${flag ? '?cascade=1' : ''}` direkt im Pfad-Template. */
function evalInlineFlagQuery(node, env) {
  const isEmptyAlt = node.alternate.type === 'Literal' && node.alternate.value === ''
  if (!isEmptyAlt || node.consequent.type !== 'Literal' || typeof node.consequent.value !== 'string') {
    return { error: 'inline flag query shape' }
  }
  const m = /^\?([A-Za-z0-9_]+)=(.+)$/.exec(node.consequent.value)
  if (!m) return { error: 'inline flag query literal shape' }
  if (node.test.type !== 'Identifier') return { error: 'inline flag query non-identifier guard' }
  const guardArg = env.get(node.test.name)
  if (!guardArg || guardArg.kind !== 'arg') return { error: 'inline flag query guard not declared arg' }
  return { entries: [{ key: m[1], value: { kind: 'literal', value: m[2] }, guardArg: guardArg.name }] }
}

/** Body-Ausdruck (3. apiRequest-Arg) → null | {kind:'rest',restName} | {kind:'fields',fields}. */
function evalBody(node, env, restName) {
  if (node.type === 'Literal' && node.value === null) return null
  if (node.type === 'Identifier' && node.name === restName) return { kind: 'rest', restName }
  if (node.type === 'ObjectExpression') {
    const r = evalObjectExpression(node, env)
    if (isUnsupported(r)) return { error: r.reason }
    return { kind: 'fields', fields: r.fields }
  }
  if (node.type === 'Identifier') {
    const v = env.get(node.name)
    if (v && v.kind === 'object') return { kind: 'fields', fields: v.fields }
    return { error: `body identifier ${node.name} not a tracked object` }
  }
  return { error: `unhandled body node type ${node.type}` }
}

/**
 * analyzeHandler({name, handlerSource}) → { ok:true, method, pathParts, query, body }
 *                                        | { ok:false, reason }
 */
export function analyzeHandler({ name, handlerSource }) {
  sawElseBranch = false
  guardStack = []
  let fn
  try {
    fn = parseExpressionAt(handlerSource, 0, { ecmaVersion: 2022 })
  } catch (e) {
    return { ok: false, reason: `parse error: ${e.message}` }
  }
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') {
    return { ok: false, reason: `unexpected handler node type ${fn.type}` }
  }
  const { declaredNames, restName, renames, error: paramError } = parseParams(fn)
  if (paramError) return { ok: false, reason: paramError }

  const env = new Map()
  for (const { jsonKey, localName } of renames) env.set(localName, { kind: 'arg', name: jsonKey })

  const stmts = bodyStatements(fn)
  walkStatements(stmts, env)
  if (sawElseBranch) return { ok: false, reason: 'if/else branching not supported (special-cased value)' }

  const call = findApiRequestCall({ type: 'Program', body: stmts })
  if (!call) return { ok: false, reason: 'no apiRequest call found' }
  const [methodNode, pathNode, bodyNode] = call.arguments
  if (!methodNode || methodNode.type !== 'Literal' || typeof methodNode.value !== 'string') {
    return { ok: false, reason: 'method not a string literal' }
  }
  const method = methodNode.value

  let pathParts, query
  if (pathNode.type === 'TemplateLiteral') {
    const r = evalPathTemplate(pathNode, env)
    if (r.error) return { ok: false, reason: r.error }
    pathParts = r.pathParts
    query = r.query
  } else if (pathNode.type === 'Literal' && typeof pathNode.value === 'string') {
    pathParts = [{ kind: 'lit', text: pathNode.value }]
    query = null
  } else {
    return { ok: false, reason: `unhandled path node type ${pathNode.type}` }
  }

  // query-Sets auf unsupported prüfen
  if (query) {
    for (const q of query) {
      if (isUnsupported(q) || isUnsupported(q.value)) {
        return { ok: false, reason: `query field unsupported: ${(q.value && q.value.reason) || q.reason}` }
      }
    }
    query = query.map((q) => ({ key: q.key, source: q.value, guardArg: q.guardArg || null }))
  }

  let body = null
  if (bodyNode && !(bodyNode.type === 'Literal' && bodyNode.value === null)) {
    const b = evalBody(bodyNode, env, restName)
    if (b && b.error) return { ok: false, reason: b.error }
    body = b
  }
  if (body && body.kind === 'fields') {
    for (const f of body.fields) {
      if (isUnsupported(f.source)) return { ok: false, reason: `body field unsupported: ${f.source.reason}` }
    }
  }

  return { ok: true, method, pathParts, query, body, declaredNames, restName }
}
