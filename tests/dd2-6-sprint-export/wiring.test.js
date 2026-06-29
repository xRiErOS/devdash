// DD2-6: Sprint-Export (CSV/MD) via CLI + MCP zugänglich. Source-Grep-Wiring-Test
// (Muster mem10-cli-mcp): stellt sicher, dass der CLI-Handler + das MCP-Tool den
// bestehenden Backend-Endpunkt /api/sprints/:id/export ansprechen. Backlog-CSV bleibt
// bewusst entfernt (DD2-123) — hier NUR Sprint-Export.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cli = readFileSync(resolve(ROOT, 'apps/cli/bin/devd-cli.js'), 'utf8')
const mcp = readFileSync(resolve(ROOT, 'apps/cli/mcp/devd-mcp.js'), 'utf8')

describe('DD2-6 — Sprint-Export CLI/MCP-Wiring', () => {
  test('CLI: sprint:export-Handler ruft /api/sprints/:id/export', () => {
    expect(cli).toMatch(/'sprint:export'/)
    const block = cli.slice(cli.indexOf("'sprint:export'"))
    expect(block).toMatch(/\/api\/sprints\/\$\{id\}\/export/)
    expect(block).toMatch(/resolveSprintId/)
    expect(block).toMatch(/format/)
  })

  test('MCP: devd_sprint_export-Tool ruft /api/sprints/:id/export', () => {
    expect(mcp).toMatch(/'devd_sprint_export'/)
    const block = mcp.slice(mcp.indexOf("'devd_sprint_export'"))
    expect(block).toMatch(/\/api\/sprints\/\$\{id\}\/export/)
    expect(block).toMatch(/resolveSprintId/)
    expect(block).toMatch(/csv/)
  })

  test('Backlog-CSV bleibt entfernt (DD2-123): kein csv im backlog-export-Serializer', () => {
    const serializer = readFileSync(resolve(ROOT, 'apps/backend/src/lib/backlogExport.js'), 'utf8')
    expect(serializer).not.toMatch(/['"]csv['"]/)
  })
})
