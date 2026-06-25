import { test, expect } from '@playwright/test'

// DD-269 — TesterLinkCard in ProjectSettings. Läuft auf devdash.* (AppShell).
// Lokal: localhost → AppShell ✓.

test.describe('DD-269 — ProjectSettings Tester-Link-Card', () => {
  test('Card sichtbar, URL korrekt, Copy-Button funktioniert', async ({ page, context, browserName }) => {
    // Clipboard-Permissions explizit zulassen (chromium only — webkit/mobile haben
    // andere Strategien; bei Fehlern toleriert die Card via Fallback-execCommand).
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }

    // DD-408: Settings-Split (DD-369/371) — `/settings` rendert jetzt GlobalSettings.
    // Die projektgebundene TesterLinkCard liegt unter `/:slug/settings` (ProjectSettings).
    await page.goto('/devd/settings')
    const card = page.getByTestId('tester-link-card')
    await expect(card).toBeVisible()

    const url = await page.getByTestId('tester-link-input').inputValue()
    expect(url).toBe('https://issues.familie-riedel.org/catch/devd')

    await page.getByTestId('tester-link-copy').click()
    await expect(page.getByTestId('tester-link-copy')).toContainText(/kopiert/i)
  })
})
