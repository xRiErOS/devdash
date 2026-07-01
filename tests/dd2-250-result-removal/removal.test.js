// DD2-250 / Welle 4 T04a — das result-Feld + der result-basierte 422-Blocker beim
// Sprint-Abschluss sind ersatzlos entfernt (Decision D14). Wissensbasis ist jetzt
// project_memory + Git-Historie, kein issue-gebundener Result-Blob mehr.
//
// Regression-Guard auf Quell-Ebene (Pattern wie das frühere dd360): pinnt, dass der
// Blocker NICHT zurückkehrt und dass die Vertrags-/Tool-Oberfläche das Feld nicht
// wieder einführt. Sprint-Abschluss ohne result-Doku darf NICHT mehr 422 werfen.

import { describe, test, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

describe('DD2-250 — result-Feld + 422-Blocker entfernt (D14)', () => {
  test('sprintCompleteGuards.js existiert nicht mehr', () => {
    expect(existsSync(join(ROOT, 'apps/backend/src/lib/sprintCompleteGuards.js'))).toBe(false)
  })

  test('api.js verweist nicht mehr auf den result-Guard', () => {
    const api = read('apps/backend/src/api.js')
    expect(api).not.toMatch(/sprintCompleteGuards/)
    expect(api).not.toMatch(/listSprintIssuesMissingResult/)
  })

  test('api.js hat keinen result-basierten 422-Block beim Sprint-Abschluss mehr', () => {
    const api = read('apps/backend/src/api.js')
    expect(api).not.toMatch(/result ist für completed\/passed Issues Pflicht/)
  })

  test('backlog-Contract trägt kein result-Feld mehr', () => {
    const contract = read('packages/api-types/backlog.contracts.js')
    expect(contract).not.toMatch(/^\s*result:\s*z\./m)
  })

  test("backlogUpdate NULLABLE_FIELDS enthält 'result' nicht mehr", () => {
    const upd = read('apps/backend/src/lib/backlogUpdate.js')
    expect(upd).not.toMatch(/'result'/)
  })

  test('MCP-Server hat das devd_issue_set_result-Tool nicht mehr', () => {
    const mcp = read('apps/cli/mcp/devd-mcp.js')
    expect(mcp).not.toMatch(/devd_issue_set_result/)
  })

  test('CLI hat den issue:set-result-Handler nicht mehr', () => {
    const cli = read('apps/cli/bin/devd-cli.js')
    expect(cli).not.toMatch(/'issue:set-result'/)
  })

  test('eine neue Drop-Migration entfernt die backlog.result-Spalte', () => {
    const mig = read('apps/backend/migrations/072_v3_dd2_250_drop_backlog_result.sql')
    expect(mig).toMatch(/ALTER TABLE backlog DROP COLUMN result/)
  })
})
