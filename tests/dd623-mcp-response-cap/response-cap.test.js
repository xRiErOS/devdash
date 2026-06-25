// DD-623: Generischer MCP-Response-Cap mit Datei-Pointer-Fallback. Tool-Ergebnisse über
// der Schwelle werden in eine Datei geschrieben; der Tool-Output trägt nur Pointer +
// Kurz-Summary. mcp/devd-mcp.js exportiert nichts (Server startet bei Import) → die
// ok()/spillToFile-Logik wird 1:1 reproduziert (Pattern wie tests/dd390) + Source-Presence.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync as readFile } from 'fs'
import { writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { readFileSync } from 'fs'

const MCP_RESPONSE_CAP = 50000
let MCP_OVERFLOW_DIR
let _overflowSeq = 0

// 1:1-Reproduktion von mcp/devd-mcp.js::spillToFile (Stand DD-623).
function spillToFile(data, text) {
  let file = null
  let writeError = null
  try {
    mkdirSync(MCP_OVERFLOW_DIR, { recursive: true })
    file = join(MCP_OVERFLOW_DIR, `resp-${Date.now()}-${_overflowSeq++}.json`)
    writeFileSync(file, text, 'utf8')
  } catch (e) {
    writeError = e.message
  }
  let shape
  if (Array.isArray(data)) {
    const keys = data.length && data[0] && typeof data[0] === 'object' ? Object.keys(data[0]) : []
    shape = `array[${data.length}]${keys.length ? ` item-keys: ${keys.join(', ')}` : ''}`
  } else if (data && typeof data === 'object') {
    shape = `object keys: ${Object.keys(data).join(', ')}`
  } else {
    shape = typeof data
  }
  return { _truncated: true, note: writeError ? `err ${writeError}` : 'ok', shape, bytes: text.length, file, preview: text.slice(0, 2000) }
}
function ok(data) {
  const text = JSON.stringify(data, null, 2)
  if (text.length <= MCP_RESPONSE_CAP) return { content: [{ type: 'text', text }] }
  return { content: [{ type: 'text', text: JSON.stringify(spillToFile(data, text), null, 2) }] }
}

describe('DD-623 — Response-Cap', () => {
  beforeEach(() => { MCP_OVERFLOW_DIR = mkdtempSync(join(tmpdir(), 'devd-dd623-')) })
  afterEach(() => rmSync(MCP_OVERFLOW_DIR, { recursive: true, force: true }))

  test('unter dem Cap: Rohinhalt unverändert durchreichen', () => {
    const small = { hello: 'world' }
    const out = ok(small)
    expect(out.content[0].text).toBe(JSON.stringify(small, null, 2))
    expect(out.content[0].text).not.toContain('_truncated')
  })

  test('über dem Cap: Datei geschrieben, nur Pointer+Summary im Output', () => {
    const big = Array.from({ length: 5000 }, (_, i) => ({ id: i, title: 'x'.repeat(40), goal: 'g'.repeat(40) }))
    const out = ok(big)
    const payload = JSON.parse(out.content[0].text)
    expect(payload._truncated).toBe(true)
    expect(payload.file).toBeTruthy()
    expect(existsSync(payload.file)).toBe(true)
    // Output selbst ist klein, die Datei trägt den Vollinhalt.
    expect(out.content[0].text.length).toBeLessThan(MCP_RESPONSE_CAP)
    expect(readFile(payload.file, 'utf8')).toBe(JSON.stringify(big, null, 2))
  })

  test('Summary trägt Shape-Hinweis (array[N] + item-keys) + Preview', () => {
    const big = Array.from({ length: 5000 }, (_, i) => ({ id: i, status: 'planned', blob: 'z'.repeat(40) }))
    const payload = JSON.parse(ok(big).content[0].text)
    expect(payload.shape).toMatch(/^array\[5000\]/)
    expect(payload.shape).toContain('item-keys: id, status, blob')
    expect(typeof payload.preview).toBe('string')
    expect(payload.bytes).toBeGreaterThan(MCP_RESPONSE_CAP)
  })
})

describe('DD-623 — Wiring', () => {
  const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')
  test('ok() konsultiert den Cap und ruft spillToFile', () => {
    expect(mcp).toMatch(/MCP_RESPONSE_CAP/)
    expect(mcp).toMatch(/function spillToFile/)
    expect(mcp).toMatch(/text\.length <= MCP_RESPONSE_CAP/)
  })
  test('Cap + Overflow-Dir per ENV überschreibbar', () => {
    expect(mcp).toMatch(/DEVD_MCP_RESPONSE_CAP/)
    expect(mcp).toMatch(/DEVD_MCP_OVERFLOW_DIR/)
  })
})
