import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import CaptureView from '../../src/views/CaptureView.jsx'

// DD-445 — Charakterisierungs-Test für den FormPage-Recompose der CaptureView.
// @testing-library/jsdom ist im Repo NICHT installiert (vitest env=node), daher
// kombiniert dieser Test:
//   (A) SSR-Smoke via react-dom/server — verifiziert, dass die View nach dem
//       Recompose ohne Crash rendert und in den FormPage-Archetyp (variant
//       "classic") einrastet, inkl. der wichtigsten data-testid-/A11y-Anker und
//       der dynamischen Header-Logik (pinned vs. bare). useEffect/fetch laufen
//       im SSR nicht — Submit-/Fetch-Flow wird über die Logik-Guard-Suites
//       (dd375/dd392) + den statischen Endpoint-Guard (C) abgedeckt.
//   (C) Statischer Endpoint-/Security-Guard — friert die exakt zwei Public-API-
//       Calls + POST /api/issues ein und schließt eine versehentliche Migration
//       auf apiClient (X-Project-Id-Leak, DD-375/DD-392) aus.

const SRC = readFileSync(
  join(process.cwd(), 'src/views/CaptureView.jsx'),
  'utf8'
)

// Code ohne Kommentare — Endpoint-/Import-Guards dürfen nicht an erklärenden
// Kommentaren auslösen (die das Wort apiClient/X-Project-Id bewusst nennen).
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('DD-445 · CaptureView SSR-Recompose (FormPage classic)', () => {
  test('bare-Modus rendert FormPage-classic-Marker + Header "DD Issues" + Anker', () => {
    const html = renderToStaticMarkup(<CaptureView />)
    // Root rastet in den FormPage-Archetyp ein.
    expect(html).toContain('data-formpage-variant="classic"')
    expect(html).toContain('data-ui="capture.form"')
    // Header-title-Slot (bare).
    expect(html).toContain('DD Issues')
    // sections-Slot Pflicht-Anker.
    expect(html).toContain('data-testid="capture-type-selector"')
    expect(html).toContain('data-testid="capture-project-select"')
    expect(html).toContain('data-testid="capture-default-settings-toggle"')
    // actionBar-Slot.
    expect(html).toContain('Erfassen')
    // Äußeres <form> bleibt erhalten (Submit-per-Enter).
    expect(html).toContain('<form')
    // Typ-Pills tragen role=radio (A11y-Semantik erhalten).
    expect(html).toContain('role="radio"')
    // aria-live Typ-Desc erhalten.
    expect(html).toContain('aria-live="polite"')
  })

  test('Type-Pill-Farben (DD-270) per CSS-Custom-Property statt inline-style erhalten', () => {
    const html = renderToStaticMarkup(<CaptureView />)
    // ref-Callback läuft im SSR nicht → die Tailwind-Arbitrary-Class trägt die
    // Custom-Property; die sanktionierte dynamische Farbe bleibt token-getrieben.
    expect(html).toContain('--pill-bg')
    expect(html).toContain('--pill-fg')
    expect(html).toContain('--pill-border')
    // Default-Typ ist 'feature' → desc sichtbar.
    expect(html).toContain('Neue Funktion oder Verhalten.')
  })

  test('default-Settings-Toggle nur im bare-Modus vorhanden', () => {
    const html = renderToStaticMarkup(<CaptureView />)
    expect(html).toContain('Default-Projekt einstellen')
  })
})

describe('DD-445 · Security/Endpoint-Invariante (statischer Guard)', () => {
  test('genau die zwei Public-Capture-Endpunkte + POST /api/issues', () => {
    expect(SRC).toContain('/api/projects/by-slug/${encodeURIComponent(pinnedSlug)}/capture')
    expect(SRC).toContain("fetch('/api/projects/list-minimal'")
    expect(SRC).toContain("fetch('/api/issues'")
  })

  test('kein neuer/anderer /api-Call eingeschleust (genau 3 fetch-Aufrufe)', () => {
    const fetchCalls = CODE.match(/\bfetch\(/g) || []
    expect(fetchCalls.length).toBe(3)
    // Kein weiterer /api/-Pfad (im Code, ohne Kommentare) als die drei erlaubten.
    const apiPaths = [...new Set(CODE.match(/\/api\/[a-z0-9/:${}()\-]+/gi) || [])]
      .filter(p => !p.startsWith('/api/projects/by-slug'))
      .filter(p => p !== '/api/projects/list-minimal')
      .filter(p => p !== '/api/issues')
    expect(apiPaths).toEqual([])
  })

  test('rohes fetch — KEINE Migration auf apiClient (kein X-Project-Id-Leak)', () => {
    // Im Code (ohne Kommentare): kein apiClient-Import/-Use, kein X-Project-Id-Header.
    expect(CODE).not.toContain('apiClient')
    expect(CODE).not.toContain('X-Project-Id')
  })

  test('credentials:include auf allen Calls erhalten', () => {
    const creds = SRC.match(/credentials:\s*'include'/g) || []
    // by-slug, list-minimal, POST /api/issues.
    expect(creds.length).toBe(3)
  })
})
