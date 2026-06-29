#!/usr/bin/env node
/**
 * introspect.mjs — Introspektions-Harness (DD2-199)
 *
 * Liefert je devd-MCP-Tool {name, description, zodShape, handlerSource}, indem es
 * `McpServer.prototype.tool` und `connect` monkeypatcht und danach
 * apps/cli/mcp/devd-mcp.js importiert. Quelle der Wahrheit sind damit die echten
 * Zod-Objekte (kein Regex über die Datei) — Mechanik aus scripts/gen-mcp-notes.mjs
 * geerbt, erweitert um den Handler-Quelltext.
 *
 * `handlerSource` (roh, .toString() des Callbacks) wird hier nur eingesammelt;
 * DD2#35 extrahiert daraus method/path fürs Transport-Mapping.
 *
 * Verwendung:
 *   import { introspect } from './introspect.mjs'
 *   const tools = await introspect()   // [{name, description, zodShape, handlerSource}, ...]
 *
 * Direkt aufgerufen (`node introspect.mjs`) gibt es eine kompakte Zusammenfassung
 * (Tool-Count + Namen) auf stdout aus — als Smoke-Check.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// codegen/ -> apps/cli-go/ -> apps/ -> <repo>
const REPO = join(__dirname, '..', '..', '..')
const MCP_ENTRY = join(REPO, 'apps/cli/mcp/devd-mcp.js')

/**
 * Zerlegt die (überladene) `server.tool(...)`-Argumentliste in {name, description,
 * zodShape, handlerSource}. Im DevDash-MCP ist die Form durchgängig
 * (name, desc, shape, handler); der Parser bleibt dennoch tolerant:
 *   - name        = erstes String-Argument
 *   - handler     = letztes Function-Argument
 *   - description = erstes String-Argument nach name (sonst '')
 *   - zodShape    = letztes Object-Argument vor dem Handler (sonst {})
 */
function parseToolArgs(args) {
  const name = typeof args[0] === 'string' ? args[0] : String(args[0] ?? '')
  let handler = null
  for (let i = args.length - 1; i >= 0; i--) {
    if (typeof args[i] === 'function') {
      handler = args[i]
      break
    }
  }
  let description = ''
  for (let i = 1; i < args.length; i++) {
    if (typeof args[i] === 'string') {
      description = args[i]
      break
    }
  }
  let zodShape = {}
  for (let i = 1; i < args.length; i++) {
    const a = args[i]
    if (a && typeof a === 'object' && a !== handler) zodShape = a
  }
  return {
    name,
    description,
    zodShape,
    handlerSource: handler ? handler.toString() : '',
  }
}

/**
 * Importiert devd-mcp.js unter abgefangenem McpServer und gibt die erfassten Tools
 * zurück. Idempotent über einen Cache-Buster am Import-Specifier (mehrfacher Aufruf
 * im selben Prozess sammelt nicht doppelt).
 */
let _seq = 0
export async function introspect() {
  const tools = []
  const origTool = McpServer.prototype.tool
  const origConnect = McpServer.prototype.connect
  McpServer.prototype.tool = function (...args) {
    tools.push(parseToolArgs(args))
    return this
  }
  McpServer.prototype.connect = async () => {} // top-level `await server.connect()` entschärfen
  try {
    await import(`${MCP_ENTRY}?introspect=${_seq++}`)
  } finally {
    McpServer.prototype.tool = origTool
    McpServer.prototype.connect = origConnect
  }
  return tools
}

// Direkt-Aufruf → Smoke-Summary
if (import.meta.url === `file://${process.argv[1]}`) {
  const tools = await introspect()
  console.log(`Tools: ${tools.length}`)
  const withShape = tools.filter((t) => Object.keys(t.zodShape).length > 0).length
  const withHandler = tools.filter((t) => t.handlerSource.length > 0).length
  console.log(`mit zodShape (>=1 Param): ${withShape}  mit handlerSource: ${withHandler}`)
  console.log(tools.map((t) => t.name).join('\n'))
}
