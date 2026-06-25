import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// DD-439 (Frontend-Rework Phase 8): Charakterisierungs-Netz für den Recompose von
// ProjectsLanding auf den ListPage-Archetyp im Grid-Modus. Source-Level-Parity
// (analog trash-listpage-parity.test.js, env=node): nagelt fest, dass beim Umhängen
// in die ListPage-Slots (a) alle Bestands-data-ui-Anker erhalten bleiben, (b) die
// View tatsächlich in den ListPage-Organismus (Grid-Variante) einrastet statt freier
// Page-Komposition, und (c) das 1:1-Verhalten-Wiring (Fetch+Guard, archived-Filter,
// open-Reihenfolge projectStore→navigate, Settings-Link) referenziert bleibt.
const SRC = readFileSync('src/views/ProjectsLanding.jsx', 'utf8')

// (a) statische data-ui-Anker
const ANCHORS = [
  'projects-landing.view',
  'projects-landing.header.global-settings',
  'projects-landing.grid.error',
  'projects-landing.grid.empty-state',
  'projects-landing.grid.list',
]
test('DD-439: ProjectsLanding data-ui Bestands-Anker bleiben erhalten', () => {
  for (const a of ANCHORS) {
    expect(SRC.includes(`data-ui="${a}"`) || SRC.includes(`'data-ui': '${a}'`), `anchor missing: ${a}`).toBe(true)
  }
})

test('DD-439: dynamische data-ui (item / open) intakt', () => {
  expect(SRC).toMatch(/data-ui=\{`projects-landing\.grid\.item\.\$\{p\.id\}`\}/)
  expect(SRC).toMatch(/data-ui=\{`projects-landing\.grid\.item\.\$\{p\.id\}\.open`\}/)
})

test('DD-439: View rastet in den ListPage-Archetyp (Grid-Modus) ein', () => {
  expect(SRC).toContain("import ListPage from '../components/ui/templates/ListPage.jsx'")
  expect(SRC).toMatch(/<ListPage\b/)
  // Grid-Modus + Pflicht-/Vorrang-Slots verdrahtet
  expect(SRC).toMatch(/layout="grid"/)
  expect(SRC).toMatch(/collection=\{projects\}/)
  expect(SRC).toMatch(/rowOrganism=\{ProjectCard\}/)
  expect(SRC).toMatch(/emptyState=\{emptyState\}/)
  expect(SRC).toMatch(/errorState=\{errorState\}/)
  // Listen-data-ui via collectionProps durchgereicht
  expect(SRC).toContain("'data-ui': 'projects-landing.grid.list'")
  // kein altes Top-Level-Eigen-Layout am Root mehr
  expect(SRC).not.toContain('min-h-screen flex flex-col')
})

test('DD-439: 1:1-Verhalten-Wiring bleibt referenziert', () => {
  // Fetch + r.ok-Guard + cancelled-Cleanup
  expect(SRC).toContain("fetch('/api/projects')")
  expect(SRC).toContain('r.ok ? r.json()')
  expect(SRC).toContain('cancelled = true')
  // archived-Filter
  expect(SRC).toMatch(/\.filter\(\(p\) => !p\.archived\)/)
  // open: projectStore VOR navigate (Reihenfolge!)
  expect(SRC).toMatch(/setActiveProjectId\(p\.id\)\s*\n\s*setActiveSlug\(p\.slug\)\s*\n\s*navigate\(`\/\$\{p\.slug\}\/home`\)/)
  // Settings-Link
  expect(SRC).toContain('to="/settings"')
  // Prefix-Badge-Fallback + Slug-Subtitle
  expect(SRC).toContain("p.prefix || (p.slug || '').slice(0, 2).toUpperCase()")
  expect(SRC).toContain('/{p.slug}')
  // dynamischer p.color über Custom-Property (kein style-Prop)
  expect(SRC).toContain("setProperty('--proj-color', p.color")
  expect(SRC).toContain('bg-[var(--proj-color)]')
})

test('DD-439: kein inline style={{}} mehr (Enforcement-Floor 0)', () => {
  expect((SRC.match(/style=\{\{/g) || []).length).toBe(0)
})
