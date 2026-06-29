// DD2-21: CLI- + MCP-Wiring fürs Dokumenten-Subsystem (Source-Grep, Muster mem10).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cli = readFileSync(resolve(ROOT, 'apps/cli/bin/devd-cli.js'), 'utf8')
const mcp = readFileSync(resolve(ROOT, 'apps/cli/mcp/devd-mcp.js'), 'utf8')

describe('DD2-21 — Document CLI/MCP-Wiring', () => {
  test('CLI: doc-Handler (list/show/add/edit/delete) vorhanden', () => {
    for (const h of ["'doc:list'", "'doc:show'", "'doc:add'", "'doc:edit'", "'doc:delete'"]) {
      expect(cli).toContain(h)
    }
    expect(cli).toMatch(/\$\{o\.base\}\/documents/)   // owner-base + /documents
    expect(cli).toMatch(/spawnSync\('glow'/)          // show via glow
    expect(cli).toMatch(/editInEditor\(`doc-/)        // edit via $EDITOR
  })

  test('MCP: devd_document_* Tools (list/get/create/update/delete)', () => {
    for (const t of ['devd_document_list', 'devd_document_get', 'devd_document_create', 'devd_document_update', 'devd_document_delete']) {
      expect(mcp).toContain(`'${t}'`)
    }
    expect(mcp).toMatch(/\$\{base\}\/documents/)
    expect(mcp).toMatch(/docOwnerBase/)
  })
})
