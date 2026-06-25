import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// DD-448 (Frontend-Rework Phase 8): Charakterisierungs-Netz für den Recompose von
// HomeDashboard auf den DashboardPage-Archetyp. Source-Level-Parity (analog
// projects-landing-listpage-parity.test.js, env=node): nagelt fest, dass beim
// Umhängen in die DashboardPage-Slots (a) die View tatsächlich in den DashboardPage-
// Organismus einrastet (summaryCard-Slot, kein freier grid-Slot für die Karten,
// kein Doppel-Card), (b) das 1:1-Verhalten-Wiring (globaler Fetch+Guard, Card-
// Deeplink-Navigation projectStore→navigate, Summary-Modal-Edit-Sync, Keyboard,
// A11y) referenziert bleibt und (c) der Enforcement-Floor (kein inline style) hält.
const SRC = readFileSync('src/views/HomeDashboard.jsx', 'utf8')

test('DD-448: View rastet in den DashboardPage-Archetyp ein', () => {
  expect(SRC).toContain("import DashboardPage from '../components/ui/templates/DashboardPage.jsx'")
  expect(SRC).toMatch(/<DashboardPage\b/)
  // Pflicht-Slots verdrahtet: Titel + summaryCard-Array + Page-Breite + dataUi
  expect(SRC).toMatch(/title="Globaler Dashboard"/)
  expect(SRC).toMatch(/summaryCard=\{/)
  expect(SRC).toMatch(/width="lg"/)
  expect(SRC).toMatch(/dataUiScope="home"/)
})

test('DD-448: Projekt-Kacheln im summaryCard-Slot (kein freier grid-Slot, R6)', () => {
  // Karten werden aus rows in den summaryCard-Slot gemappt
  expect(SRC).toMatch(/summaryCard=\{showGrid[\s\S]*rows\.map\(p =>/)
  expect(SRC).toMatch(/<ProjectSummaryCard\b/)
  // kein altes Top-Level-Breakpoint-Grid am Root mehr (DashboardPage stellt auto-fit)
  expect(SRC).not.toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')
  // kein eigener max-w-6xl-Root-Wrapper mehr (PageShell width="lg" übernimmt)
  expect(SRC).not.toContain('max-w-6xl mx-auto')
})

test('DD-448: kein Doppel-Card — eigener Card-Container der Kachel entfällt (R2)', () => {
  // Die alte ProjectSummaryCard trug selbst einen Card-Container (rounded-xl p-4 +
  // background-style); DashboardPage wrappt jeden summaryCard-Knoten bereits in
  // Card tone="mantle" padding="md". Der alte Container-className-Block ist weg.
  expect(SRC).not.toContain("className=\"text-left rounded-xl p-4 flex flex-col")
  // ebenso kein background-style auf der Kachel mehr (durch Card-tone abgelöst)
  expect(SRC).not.toContain("background: 'var(--surface0)'")
})

test('DD-448: globaler Live-Daten-Fetch 1:1 (kein Projekt-Scope, R7)', () => {
  expect(SRC).toContain("fetch('/api/dashboard/home')")
  expect(SRC).toContain('if (!r.ok) throw new Error')
  expect(SRC).toContain('cancelled = true')
  // kein projekt-gescopter apiClient eingeschleust
  expect(SRC).not.toContain('apiClient')
})

test('DD-448: Card-Deeplink-Navigation (projectStore VOR navigate, DD-368) 1:1', () => {
  expect(SRC).toMatch(/setActiveProjectId\(row\.projectId\)/)
  expect(SRC).toMatch(/setActiveSlug\(row\.slug\)\s*\n\s*navigate\(`\/\$\{row\.slug\}\/board`\)/)
})

test('DD-523: KI-Summary-Modal vollständig entfernt (D49)', () => {
  expect(SRC).not.toContain('AiSummaryModal')
  expect(SRC).not.toContain('onSummaryUpdated')
  expect(SRC).not.toContain('modalProject')
  expect(SRC).not.toContain('aiSummary')
})

test('DD-523: AI-Trigger (Sparkles/ai-trigger) vollständig entfernt (D49)', () => {
  expect(SRC).not.toContain('data-role="ai-trigger"')
  expect(SRC).not.toContain('onOpenSummary')
  expect(SRC).not.toContain('Sparkles')
})

test('DD-448: Keyboard-Deeplink (Enter/Space) + A11y-Anker 1:1', () => {
  expect(SRC).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/)
  expect(SRC).toContain('role="button"')
  expect(SRC).toContain('tabIndex={0}')
  expect(SRC).toContain('aria-label={`Projekt ${p.name} öffnen`}')
  expect(SRC).toContain('role="alert"')
})

test('DD-448: vier Kennzahl-Stats je Karte mit Label 1:1', () => {
  expect(SRC).toContain('value={p.openSprints} label="Sprints"')
  expect(SRC).toContain('value={p.openMilestones} label="Milestones"')
  expect(SRC).toContain('value={p.issuesInSprints} label="im Sprint"')
  expect(SRC).toContain('value={p.issuesInBacklog} label="im Backlog"')
})

test('DD-448: Loading/Error/Empty bleiben page-weite Knoten (R5) im grid-Slot', () => {
  expect(SRC).toContain('data-ui="home.state.loading"')
  expect(SRC).toContain('data-ui="home.state.error"')
  expect(SRC).toContain('data-ui="home.state.empty"')
  expect(SRC).toMatch(/grid=\{stateNode\}/)
})

test('DD-448: dynamischer p.color via CSS-Custom-Property (kein style-Prop, R4)', () => {
  expect(SRC).toContain("setProperty('--proj-accent', p.color")
  expect(SRC).toContain('border-[var(--proj-accent)]')
  expect(SRC).toContain("setProperty('--proj-color', p.color")
  expect(SRC).toContain('bg-[var(--proj-color)]')
})

test('DD-448: kein inline style={{}} mehr (Enforcement-Floor 0)', () => {
  expect((SRC.match(/style=\{\{/g) || []).length).toBe(0)
})
