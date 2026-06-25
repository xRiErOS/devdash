// DD-447 → DD-518 — Charakterisierungs-Test für GlobalSettings.
// URSPRUNG (DD-447): fror die pfadabhängige KI-Nav-Sicht-Ableitung fest
//   (Landing-Grid → /settings/api-keys + /settings/ai-cost, ApiKeysView-Verzweigung).
// UMGESTELLT (DD-518, D49/D50): Die KI-Nav ist ENTFERNT. GlobalSettings rendert jetzt
//   pfad-unabhängig den SOP-Slot-Editor (dynamische Liste aus GET /api/sops). Der Test
//   charakterisiert nun den SOP-Slot-View-Frame (kein Live-Fetch im SSR → Loading-Zweig)
//   und hält die weiterhin gültigen Struktur-Anker fest: Breadcrumb, Back-Link → /projekte,
//   FormPage variant="settings", body-data-ui. SSR via renderToStaticMarkup (Node-Env).
import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import GlobalSettings from '../../src/views/GlobalSettings.jsx'

function renderAt(pathname) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[pathname]}>
      <GlobalSettings />
    </MemoryRouter>
  )
}

describe('DD-518 · GlobalSettings SOP-Slot-Editor (KI-Nav entfernt)', () => {
  test('C1 /settings → SOP-Slot-View: Titel + Slot-Liste, KEINE KI-Nav', () => {
    const html = renderAt('/settings')
    expect(html).toContain('Globale Einstellungen')
    expect(html).toContain('data-ui="global-settings.sop-list"')
    expect(html).toContain('data-ui="global-settings.subtitle"')
    // KI-Nav (Landing-Grid + ApiKeys/Ai-Cost-Kacheln) darf NICHT mehr auftauchen (D49)
    expect(html).not.toContain('data-ui="global-settings.nav"')
    expect(html).not.toContain('href="/settings/api-keys"')
    expect(html).not.toContain('href="/settings/ai-cost"')
  })

  test('C2 /settings/api-keys → derselbe SOP-Slot-View (pfad-unabhängig, keine ApiKeysView)', () => {
    const html = renderAt('/settings/api-keys')
    expect(html).toContain('data-ui="global-settings.sop-list"')
    // Keine ApiKeys-Verzweigung mehr
    expect(html).not.toContain('data-ui="global-settings.api-keys"')
    expect(html).not.toContain('data-ui="global-settings.nav"')
  })

  test('C3 Breadcrumb-Spur auf beiden Pfaden (Projekte-Link)', () => {
    expect(renderAt('/settings')).toContain('href="/projects"')
    expect(renderAt('/settings/api-keys')).toContain('href="/projects"')
  })

  test('Back-Link: data-ui erhalten, Ziel-Route → /projects (pfad-unabhängig)', () => {
    const landing = renderAt('/settings')
    expect(landing).toContain('data-ui="global-settings.back"')
    expect(landing).toContain('href="/projects"')

    const apiKeys = renderAt('/settings/api-keys')
    expect(apiKeys).toContain('data-ui="global-settings.back"')
    expect(apiKeys).toContain('href="/projects"')
  })

  test('Frame-Anker: FormPage variant="settings" + body-data-ui gerendert', () => {
    expect(renderAt('/settings')).toContain('data-formpage-variant="settings"')
    expect(renderAt('/settings/api-keys')).toContain('data-formpage-variant="settings"')
    expect(renderAt('/settings')).toContain('data-ui="global-settings.body"')
  })
})
