import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { DONE_SPRINT_STATUSES, isDoneSprint } from '../../src/components/ui/organisms/RoadmapColumns.jsx'

// DD-536 — Regressions-Guard für die Sprint-„Erledigt"-Klassifikation im Roadmap-Board.
// Bug: der „Erledigte aus"-Filter (hideCompleted) filterte SPRINTS mit
// DONE_STATUSES = ['done','passed','cancelled'] (ISSUE-Vokabular). Sprint-Lifecycle
// ist planning/active/review/completed/closed/cancelled → 'completed'/'closed'
// matchten nie → abgeschlossene Sprints blieben sichtbar (Board mit 68 Sprints
// geflutet, PO beim Sprint-Abschluss blockiert). Fix: sprint-eigenes Done-Set.
//
// DD-510 (Board-Neubau): Das 3-Modi-IST wurde durch das Spalten-Board ersetzt.
// Der „hide/separate completed"-Mechanismus lebt jetzt im geteilten Präsentations-
// Modul (RoadmapColumns.jsx) als DONE_SPRINT_STATUSES + isDoneSprint und trennt
// abgeschlossene Sprints am Spaltenfuss. Der DD-536-Invariant bleibt: das Set ist
// SPRINT-Vokabular, niemals Issue-Status. Dieser Guard verfolgt jetzt das geteilte
// Modul (Single-Source) statt die alte View-Quelle.
const COLS = readFileSync('src/components/ui/organisms/RoadmapColumns.jsx', 'utf8')

test('DD-536: sprint-eigenes Done-Set (completed/closed/cancelled, NICHT die Issue-Status)', () => {
  expect(DONE_SPRINT_STATUSES).toEqual(expect.arrayContaining(['completed', 'closed', 'cancelled']))
  // Issue-Status dürfen NICHT in das Sprint-Set rutschen (ein Sprint ist nie done/passed).
  expect(DONE_SPRINT_STATUSES).not.toContain('done')
  expect(DONE_SPRINT_STATUSES).not.toContain('passed')
})

test('DD-536: isDoneSprint klassifiziert auf Basis des Sprint-Done-Sets', () => {
  expect(isDoneSprint({ status: 'completed' })).toBe(true)
  expect(isDoneSprint({ status: 'closed' })).toBe(true)
  expect(isDoneSprint({ status: 'cancelled' })).toBe(true)
  // offene Sprints (auch das Issue-Vokabular 'done'/'passed') bleiben sichtbar.
  expect(isDoneSprint({ status: 'active' })).toBe(false)
  expect(isDoneSprint({ status: 'done' })).toBe(false)
  expect(isDoneSprint({ status: 'passed' })).toBe(false)
})

test('DD-536: das Board nutzt isDoneSprint zur Trennung am Spaltenfuss', () => {
  // ColumnBody separiert offene (oben) vs. abgeschlossene (unten) via isDoneSprint.
  expect(COLS).toMatch(/isDoneSprint/)
  expect(COLS).toMatch(/\.filter\(isDoneSprint\)/)
})
