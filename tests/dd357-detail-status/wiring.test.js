// DD-357 — Milestone-Status-Control auf der Detailseite.
//
// PO-Reject: "ich kann an keiner stelle den status des meilensteins überhaupt auf
// in arbeit setzen. das sollte auf meilenstein-details passieren können."
//
// Fix: MilestoneDetail.jsx bekommt status-abhängige Buttons (In Arbeit / Abschließen /
// Wieder öffnen) + handleSetStatus, der PUT /api/milestones/:id { status } feuert.
//
// Source-level grep (Pattern wie tests/dd360-complete-block): verifiziert die
// Verdrahtung ohne React-Render (environment: node).

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const src = readFileSync(join(ROOT, 'src/views/MilestoneDetail.jsx'), 'utf8')

describe('DD-357 — Milestone-Status-Control auf der Detailseite', () => {
  test('handleSetStatus ist definiert', () => {
    expect(src).toMatch(/const handleSetStatus\s*=\s*async\s*\(nextStatus\)/)
  })

  test('PUT auf /api/milestones mit status im Body', () => {
    expect(src).toMatch(/fetch\('\/api\/milestones\/'\s*\+\s*id/)
    expect(src).toMatch(/method:\s*'PUT'/)
    expect(src).toMatch(/JSON\.stringify\(\{\s*status:\s*nextStatus\s*\}\)/)
  })

  test('die 3 data-ui-Slugs sind vorhanden', () => {
    expect(src).toMatch(/data-ui="milestone-detail\.status-start"/)
    expect(src).toMatch(/data-ui="milestone-detail\.status-complete"/)
    expect(src).toMatch(/data-ui="milestone-detail\.status-reopen"/)
  })

  test('handleSetStatus(active) und handleSetStatus(completed) sind verdrahtet', () => {
    expect(src).toMatch(/handleSetStatus\('active'\)/)
    expect(src).toMatch(/handleSetStatus\('completed'\)/)
  })

  test('completed-Übergang ist gated (Dialog bei offenen Issues ODER window.confirm)', () => {
    // DD-464 (455c): handleSetStatus prüft jetzt zuerst /open-issues und öffnet
    // bei >0 den MilestoneCloseDialog (Triage); sonst greift weiterhin der
    // window.confirm-Fallback. Beide Pfade gaten den Übergang.
    const idx = src.indexOf("nextStatus === 'completed'")
    const snippet = src.slice(idx, idx + 700)
    expect(snippet).toMatch(/open-issues/)
    expect(snippet).toMatch(/setCloseDialog/)
    expect(snippet).toMatch(/window\.confirm/)
    expect(snippet).toMatch(/return/)
  })

  test('reload() im ok-Pfad', () => {
    expect(src).toMatch(/reload\(\)/)
    // Im handleSetStatus-Block (nach dem success-Toast) wird reload aufgerufen.
    // DD-464 (455c): durch die open-issues-Probe ist der Block länger → Fenster vergrößert.
    const idx = src.indexOf('const handleSetStatus')
    const snippet = src.slice(idx, idx + 2000)
    expect(snippet).toMatch(/reload\(\)/)
  })

  test('error-Pfad feuert error-Toast', () => {
    expect(src).toMatch(/if\s*\(!res\.ok\)/)
    expect(src).toMatch(/kind:\s*'error'/)
  })

  test('PlayCircle + RotateCcw sind importiert', () => {
    expect(src).toMatch(/PlayCircle/)
    expect(src).toMatch(/RotateCcw/)
  })
})
