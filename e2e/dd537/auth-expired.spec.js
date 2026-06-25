import { test, expect } from '@playwright/test'

// DD-537 — Abgelaufene Authelia-Session: zentrales Erkennen statt irrefuehrender
// „Projekt konnte nicht geladen werden".
//
// e2e laeuft auf localhost (vom Auth-Gate ausgeschlossen), daher erzwingt der
// Test-Seam window.__devdForceAuthGate das Gate, um den Browser-Flow zu pruefen.

test.describe('DD-537 · Auth-Expired Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.__devdForceAuthGate = true })
  })

  test('401 auf /api/projects → "Session abgelaufen"-Overlay, KEIN generischer Ladefehler', async ({ page }) => {
    // DD-620: apiClient hängt an Browser-GET-/api/-Requests `?fields=full` an → der Glob
    // muss die Query-Variante matchen (`*` nach projects, kein Slash → trifft nicht /:id).
    await page.route('**/api/projects*', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'UNAUTHENTICATED' }),
      }),
    )

    await page.goto('/devd/home')

    await expect(page.getByRole('heading', { name: 'Session abgelaufen' }))
      .toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: 'Neu anmelden' })).toBeVisible()
    // Die irrefuehrende projekt-spezifische Meldung darf NICHT erscheinen.
    await expect(page.getByText(/konnte nicht geladen werden/)).toHaveCount(0)
  })

  test('500 auf /api/projects → generischer Fehler, KEIN Auth-Overlay (kein Regress)', async ({ page }) => {
    // DD-620: apiClient hängt an Browser-GET-/api/-Requests `?fields=full` an → der Glob
    // muss die Query-Variante matchen (`*` nach projects, kein Slash → trifft nicht /:id).
    await page.route('**/api/projects*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'BOOM' }),
      }),
    )

    await page.goto('/devd/home')

    await expect(page.getByText(/konnte nicht geladen werden/))
      .toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('heading', { name: 'Session abgelaufen' }))
      .toHaveCount(0)
  })

  test('Overlay ist bei Tablet- und Desktop-Breite zentriert sichtbar', async ({ page }) => {
    // DD-620: apiClient hängt an Browser-GET-/api/-Requests `?fields=full` an → der Glob
    // muss die Query-Variante matchen (`*` nach projects, kein Slash → trifft nicht /:id).
    await page.route('**/api/projects*', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    )
    for (const width of [820, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/devd/home')
      await expect(page.getByRole('heading', { name: 'Session abgelaufen' }))
        .toBeVisible({ timeout: 5_000 })
    }
  })
})
