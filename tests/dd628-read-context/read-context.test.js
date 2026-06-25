// DD-628: Lean Read-Context MCP-Tools — backlog-export, planning-prompt, dashboard-home,
// dependencies-graph in einem Call. Read-only; der generische Response-Cap (DD-623)
// schützt die potenziell großen Outputs. MCP-only (AI-Kontext).

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'

const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')

describe('DD-628 — Read-Context-Tools', () => {
  test('registers backlog_export/planning_prompt/dashboard_home/dependencies_graph', () => {
    for (const t of ['devd_backlog_export', 'devd_planning_prompt', 'devd_dashboard_home', 'devd_dependencies_graph']) {
      expect(mcp).toContain(`'${t}'`)
    }
  })
  test('treffen die richtigen Read-Endpoints', () => {
    expect(mcp).toMatch(/\/api\/backlog-export/)
    expect(mcp).toMatch(/\/api\/planning-prompt/)
    expect(mcp).toMatch(/'GET', '\/api\/dashboard\/home'/)
    expect(mcp).toMatch(/\/api\/dependencies\/graph/)
  })
  test('Markdown/CSV-Text wird direkt durchgereicht (okTextOrError), nicht JSON-gequotet', () => {
    expect(mcp).toMatch(/function okTextOrError/)
    expect(mcp).toMatch(/return okTextOrError\(await apiRequest\('GET', `\/api\/backlog-export/)
  })
  test('dependencies_graph resolved sprint_key auf sprint_id', () => {
    expect(mcp).toMatch(/sprint_id', String\(await resolveSprintId\(sprint_key/)
  })
})
