#!/usr/bin/env node
/**
 * capabilities.mjs — Soll-Dump-Emitter (DD2-200)
 *
 * Liest die introspizierten Tools (DD2-199) und schreibt
 * apps/cli-go/internal/api/generated/capabilities.json:
 *   { generatedFrom, toolCount, tools: { <name>: { description, inputSchema } } }
 *
 * inputSchema = z.toJSONSchema(z.object(zodShape)). Deterministisch (Tool-Namen
 * sortiert) und versioniert — Soll-Stand fürs Freshness-Gate (DD2#37).
 *
 *   node apps/cli-go/codegen/capabilities.mjs
 *
 * Out-of-Scope: Gate-Logik/Diff (DD2#37), Transport, Go-Emit.
 */
import { z } from 'zod'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { introspect } from './introspect.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'internal', 'api', 'generated')
const OUT_FILE = join(OUT_DIR, 'capabilities.json')

/**
 * Zod-Shape → JSONSchema. `unrepresentable: 'any'` toleriert nicht abbildbare
 * Typen (wie in gen-mcp-notes.mjs), statt hart zu werfen. Param-lose Tools
 * ergeben ein leeres properties-Objekt (Schema bleibt non-leer: type/properties).
 */
export function shapeToJsonSchema(zodShape) {
  return z.toJSONSchema(z.object(zodShape ?? {}), { unrepresentable: 'any' })
}

/** Baut das deterministische capabilities-Manifest aus den introspizierten Tools. */
export function buildCapabilities(tools) {
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name))
  const out = {}
  for (const t of sorted) {
    out[t.name] = {
      description: t.description ?? '',
      inputSchema: shapeToJsonSchema(t.zodShape),
    }
  }
  return {
    generatedFrom: 'apps/cli/mcp/devd-mcp.js',
    toolCount: sorted.length,
    tools: out,
  }
}

export async function emitCapabilities() {
  const tools = await introspect()
  const manifest = buildCapabilities(tools)
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n')
  return { manifest, outFile: OUT_FILE }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { manifest, outFile } = await emitCapabilities()
  const names = Object.keys(manifest.tools)
  const empty = names.filter((n) => {
    const s = manifest.tools[n].inputSchema
    return !s || Object.keys(s).length === 0
  })
  console.log(`OK: ${manifest.toolCount} Tools → ${outFile}`)
  if (empty.length) {
    console.error(`FAIL: ${empty.length} leere Schemas: ${empty.join(', ')}`)
    process.exit(1)
  }
}
