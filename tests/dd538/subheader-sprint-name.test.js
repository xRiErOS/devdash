import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(resolve(__dirname, '../../apps/frontend/src/components/ui/layout/Layout.jsx'), 'utf8')

// DD-538 (historisch) — SubHeader Sprint-Kontext-Bar (aktiver-Sprint-Link mit
// truncate-Verhalten @≤1024px).
//
// DD-532 (B03) — der aktive-Sprint-Link wird komplett entfernt (keine Funktion
// fuer den PO). Damit ist die DD-538-Truncate-Regel gegenstandslos; dieser
// Source-Audit prueft jetzt das Gegenteil: der Link + die zugehoerige
// `activeSprint`-State/Fetch-Logik sind aus Layout.jsx verschwunden, waehrend
// der SEARCH-Pfad des SubHeaders unangetastet bleibt.

describe('DD-532 · SubHeader active-sprint Link + dead state entfernt', () => {
  test('active-sprint-link data-ui ist GELOESCHT', () => {
    expect(src).not.toMatch(/data-ui="app-shell\.sub-header\.active-sprint-link"/)
  })

  test('activeSprint-State/Setter ist GELOESCHT', () => {
    expect(src).not.toMatch(/\bactiveSprint\b/)
    expect(src).not.toMatch(/\bsetActiveSprint\b/)
  })

  test('kein /api/sprints-Mount-Fetch mehr im SubHeader (sprintLabel/firstLine weg)', () => {
    // sprintLabel + firstLine wurden ausschliesslich vom Sprint-Link genutzt.
    expect(src).not.toMatch(/\bsprintLabel\b/)
    expect(src).not.toMatch(/\bfirstLine\b/)
  })

  // DD-670: Die Suche ist aus dem SubHeader in den Page-Header verlagert; der
  // SubHeader trägt KEINE Suche mehr. Die showSearch-Logik bleibt (jetzt im
  // Layout-Body, steuert den Page-Header-Such-Block).
  test('SEARCH-Pfad lebt jetzt im Page-Header (DD-670), nicht im SubHeader', () => {
    expect(src).toMatch(/data-ui="app-shell\.page-header\.search"/)
    expect(src).toMatch(/data-ui="app-shell\.page-header\.search-clear"/)
    expect(src).not.toMatch(/data-ui="app-shell\.sub-header\.search"/)
    expect(src).toMatch(/const showSearch =/)
    // DD-670: SubHeader ist eine uniforme Leiste OHNE showSearch-Gate.
    expect(src).not.toMatch(/if \(!showSearch\) return null/)
  })

  test('SubHeader-Container rendert weiterhin (data-ui app-shell.sub-header)', () => {
    expect(src).toMatch(/data-ui="app-shell\.sub-header"/)
  })
})
