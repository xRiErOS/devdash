import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
// DD-586: ShortcutsHelp.jsx archived → import ui/molecules canonical variant
import ShortcutsHelp from '../../src/components/ui/molecules/ShortcutsHelp.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..', '..')

describe('DD-272 · ShortcutsHelp shows "c" for Create-Issue', () => {
  test('Aktionen-Section listet "c" und nicht mehr "n" für Neues Issue', () => {
    const html = renderToStaticMarkup(<ShortcutsHelp open={true} onClose={() => {}} />)
    expect(html).toMatch(/Neues Issue anlegen[\s\S]*?<kbd[^>]*>c<\/kbd>/)
    expect(html).not.toMatch(/Neues Issue anlegen[\s\S]{0,400}?<kbd[^>]*>n<\/kbd>/)
  })

  test('rendert nichts wenn open=false', () => {
    const html = renderToStaticMarkup(<ShortcutsHelp open={false} onClose={() => {}} />)
    expect(html).toBe('')
  })
})

describe('DD-272 · Shortcut-Map Source-Audit', () => {
  test('Layout.jsx bindet Create-Issue auf "c", nicht auf "n"', () => {
    const src = readFileSync(resolve(repoRoot, 'src/components/ui/layout/Layout.jsx'), 'utf8')
    expect(src).toMatch(/c:\s*\(\)\s*=>\s*setIssueModalOpen\(true\)/)
    expect(src).not.toMatch(/^\s*n:\s*\(\)\s*=>\s*setIssueModalOpen\(true\)/m)
  })

  test('BacklogPage.jsx bindet Create-Issue auf "c", nicht auf "n"', () => {
    const src = readFileSync(resolve(repoRoot, 'src/views/BacklogPage.jsx'), 'utf8')
    expect(src).toMatch(/c:\s*\(\)\s*=>\s*setIssueModal\(true\)/)
    expect(src).not.toMatch(/^\s*n:\s*\(\)\s*=>\s*setIssueModal\(true\)/m)
  })

  test('BacklogPage Tooltip-title nennt "c", nicht "n"', () => {
    const src = readFileSync(resolve(repoRoot, 'src/views/BacklogPage.jsx'), 'utf8')
    // DD-529 R2: New-Control ist ein menuOnly-SplitButton; der „Neues Issue"-Eintrag
    // führt den c-Shortcut im title (Item-Objekt). Formagnostisch prüfen.
    expect(src).toMatch(/Neues Issue \(Tastatur: c\)/)
    expect(src).not.toContain('Neues Issue (Tastatur: n)')
  })

  // DD-510 deferred: Das Spalten-Board hat (noch) keine Keyboard-Shortcuts —
  // Issue-Create via "c" im Roadmap-Board ist DEFERRED (PO-Parity-Liste). Der
  // ehemals geskippte RoadmapBoard-Shortcut-Assert ist entfernt; Re-Add sobald
  // Shortcuts wieder im Board landen. Layout-/Backlog-Bindings (oben) bleiben aktiv.
})
