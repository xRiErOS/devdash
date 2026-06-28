// AppShell-Boot (DD2) — der Shell-Frame rendert unter MemoryRouter zu validem
// Markup (Rail + Topbar + Outlet-Stub), ProjectScope gated den Kind-Render bis
// der Projekt-Slug aufgelöst ist, und die Nav-/Chrome-Helfer sind pure korrekt.
//
// SSR-only (node-env, renderToStaticMarkup, kein jsdom): useEffect läuft NICHT →
// der projectStore wird vor dem Render geseedet, um den synchronen Ready-Pfad
// von ProjectScope zu testen (DD-Review 2026-06-24: Store muss VOR Kind-Render stehen).
import { describe, test, expect, beforeAll } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppShellView } from '../../apps/frontend/src/screens/_shell/AppRoot.jsx'
import {
  setActiveProjectId,
  setActiveSlug,
  getActiveProjectId,
} from '../../apps/frontend/src/lib/projectStore.js'
import { withProjectSlug } from '../../apps/frontend/src/lib/useProjectNav.js'
import { resolveChromeTitle } from '../../apps/frontend/src/lib/pageChrome.jsx'

const render = (props) => renderToStaticMarkup(<AppShellView {...props} />)

describe('AppShellView — Frame rendert mit Rail + Topbar', () => {
  beforeAll(() => {
    // Store synchron seeden (devd2 = project_id 10) → ProjectScope-Initial-State
    // ist 'ready' ohne Fetch (SSR-Effekt läuft nicht).
    setActiveSlug('devd2')
    setActiveProjectId(10)
  })

  test('/devd2/roadmap → Frame + roadmap-Stub', () => {
    const html = render({ initialPath: '/devd2/roadmap' })
    expect(html).toContain('data-ui="app-shell.frame"')
    expect(html).toContain('data-ui="app-shell.rail"')
    expect(html).toContain('data-ui="app-shell.topbar"')
    expect(html).toContain('data-ui="app-shell.content"')
    expect(html).toContain('data-ui="screen:roadmap.placeholder"')
  })

  test('aktives Rail-Item spiegelt das View-Segment (roadmap aktiv)', () => {
    const html = render({ initialPath: '/devd2/roadmap' })
    // NavigationRail markiert das aktive Item via aria-pressed am IconButton.
    // Reihenfolge im Markup: data-ui="…item-roadmap" … aria-pressed (danach).
    const idx = html.indexOf('app-shell.rail.item-roadmap')
    const slice = html.slice(idx, idx + 120)
    expect(slice).toContain('aria-pressed="true"')
  })

  test('globale Route /home rendert ToolHome im Frame (kein ProjectScope-Gate)', () => {
    const html = render({ initialPath: '/home' })
    expect(html).toContain('data-ui="app-shell.frame"')
    expect(html).toContain('data-ui="screen.toolHome.connected"')
  })

  test('forceBanner zeigt Unknown-Host-Banner', () => {
    const html = render({ initialPath: '/projects', forceBanner: true })
    expect(html).toContain('data-ui="boot.unknown-host-banner"')
  })
})

describe('ProjectScope — gated Kind-Render bis Slug aufgelöst', () => {
  test('unbekannter/ungeseedeter Slug → Ladezustand, KEIN Stub', () => {
    // Store steht auf devd2; ein fremder Slug ist weder gecached noch aktiv →
    // synchron 'loading' (Effekt-Fetch läuft im SSR nicht).
    const html = render({ initialPath: '/fremdprojekt/home' })
    expect(html).toContain('data-ui="screen:project-scope.loading"')
    expect(html).not.toContain('data-ui="screen:project-home.placeholder"')
  })

  test('geseedeter Slug rendert den Kind-Stub (Store treibt Scope)', () => {
    const html = render({ initialPath: '/devd2/home' })
    expect(getActiveProjectId()).toBe(10)
    expect(html).toContain('data-ui="screen:project-home.placeholder"')
  })
})

describe('withProjectSlug — pure Slug-Prefix-Logik', () => {
  test('projekt-gescopter Pfad bekommt Slug-Prefix', () => {
    expect(withProjectSlug('/backlog', 'devd2')).toBe('/devd2/backlog')
    expect(withProjectSlug('/issues/42', 'devd2')).toBe('/devd2/issues/42')
  })

  test('globale Top-Level-Segmente bleiben unverändert', () => {
    expect(withProjectSlug('/projects', 'devd2')).toBe('/projects')
    expect(withProjectSlug('/settings', 'devd2')).toBe('/settings')
  })

  test('global:true erzwingt keinen Prefix', () => {
    expect(withProjectSlug('/foo', 'devd2', { global: true })).toBe('/foo')
  })

  test('bereits gescopter Pfad wird nicht doppelt geprefixt', () => {
    expect(withProjectSlug('/devd2/backlog', 'devd2')).toBe('/devd2/backlog')
  })

  test('ohne Slug bleibt der Pfad unverändert', () => {
    expect(withProjectSlug('/backlog', null)).toBe('/backlog')
  })
})

describe('resolveChromeTitle — pure Pfad-gescopter Titel', () => {
  test('Titel nur bei Pfad-Match', () => {
    expect(resolveChromeTitle({ path: '/x', title: 'Hallo' }, '/x')).toBe('Hallo')
    expect(resolveChromeTitle({ path: '/x', title: 'Hallo' }, '/y')).toBe('')
    expect(resolveChromeTitle(null, '/x')).toBe('')
  })
})
