// DD-670 — Uniformer App-Shell-SubHeader auf ALLEN Screens + Suche im Page-Header.
//
// PO-Entscheid (bindend): Die View-Suche wandert aus der SubHeader-Leiste in den
// rechten Aktions-Cluster des Page-Headers (neben Hilfe + Theme), gegated auf die
// durchsuchbaren Views (board/backlog/milestones/dependencies/review). Auf allen
// anderen Views existiert KEIN Such-Block. Der SubHeader wird zu einer uniformen,
// schlanken Leiste, die auf ALLEN Views konstant rendert (kein Layout-Sprung),
// vorerst leer/minimal — KEINE Suche mehr.
//
// Source-Guard (repo-env = node, kein jsdom): Audit auf das echte Layout-Source.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(
  resolve(__dirname, '../../apps/frontend/src/components/ui/layout/Layout.jsx'),
  'utf8',
)

describe('DD-670 · Suche im Page-Header, View-gegated', () => {
  test('Such-Input trägt den page-header.search-Anker (nicht mehr sub-header)', () => {
    expect(src).toMatch(/data-ui="app-shell\.page-header\.search"/)
    expect(src).toMatch(/data-ui="app-shell\.page-header\.search-clear"/)
  })

  test('Suche ist auf die durchsuchbaren Views gegated (showSearch-Liste)', () => {
    expect(src).toMatch(/const showSearch =/)
    for (const view of ['board', 'backlog', 'milestones', 'dependencies', 'review']) {
      expect(src).toMatch(new RegExp(`=== '${view}'`))
    }
    // Der Such-Block im Page-Header hängt am showSearch-Gate.
    expect(src).toMatch(/\{showSearch && \(/)
    // showSearch wird als Prop in den PageHeader durchgereicht.
    expect(src).toMatch(/showSearch=\{showSearch\}/)
  })

  test('iOS-Zoom-Guard (16px) + 44px-Touch-Target am Such-Input erhalten', () => {
    expect(src).toMatch(/fontSize: '16px'/)
    expect(src).toMatch(/minHeight: '44px'/)
  })
})

describe('DD-670 · SubHeader ist eine uniforme Leiste auf ALLEN Views', () => {
  test('app-shell.sub-header-Container rendert weiterhin', () => {
    expect(src).toMatch(/data-ui="app-shell\.sub-header"/)
  })

  test('SubHeader hat KEIN showSearch-Early-Return mehr (immer präsent)', () => {
    expect(src).not.toMatch(/if \(!showSearch\) return null/)
  })

  test('SubHeader enthält KEINE Suche mehr (kein sub-header.search-Anker)', () => {
    expect(src).not.toMatch(/data-ui="app-shell\.sub-header\.search"/)
    expect(src).not.toMatch(/data-ui="app-shell\.sub-header\.search-clear"/)
  })

  test('uniforme Leiste hat konstante Höhe + Border-Bottom + Background', () => {
    // SubHeader-Render-Block: min-h-[…] + border-b-[var(--surface0)] + bg-[var(--mantle)].
    const subHeaderBlock = src.slice(
      src.indexOf('function SubHeader'),
      src.indexOf('function SubHeader') + 600,
    )
    expect(subHeaderBlock).toMatch(/min-h-\[/)
    expect(subHeaderBlock).toMatch(/border-b-\[var\(--surface0\)\]/)
    expect(subHeaderBlock).toMatch(/bg-\[var\(--mantle\)\]/)
  })
})

describe('DD-670 · Verdrahtung intakt — Shortcut, URL-Sync, Palette', () => {
  test("'/'-Shortcut fokussiert den relozierten Page-Header-Input", () => {
    // focusSearch zielt jetzt auf den page-header.search-Anker.
    expect(src).toMatch(
      /querySelector\('\[data-ui="app-shell\.page-header\.search"\]'\)/,
    )
    expect(src).toMatch(/'\/':\s*\(\)\s*=>\s*focusSearch\(\)/)
  })

  test('debounced ?search=-URL-Sync bleibt erhalten', () => {
    expect(src).toMatch(/setSearchParams\(next, \{ replace: true \}\)/)
    expect(src).toMatch(/next\.set\('search'/)
    expect(src).toMatch(/next\.delete\('search'\)/)
    expect(src).toMatch(/SEARCH_DEBOUNCE_MS/)
  })

  test('searchInputRef wird in den PageHeader durchgereicht', () => {
    expect(src).toMatch(/searchInputRef=\{searchInputRef\}/)
    expect(src).toMatch(/ref=\{searchInputRef\}/)
  })

  test('⌘K-Command-Palette (DD-634) bleibt unberührt', () => {
    expect(src).toMatch(/'mod\+k':\s*\(\)\s*=>\s*setPaletteOpen\(true\)/)
    expect(src).toMatch(/<CommandPalette/)
  })
})
