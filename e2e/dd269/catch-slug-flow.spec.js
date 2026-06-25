import { test, expect } from '@playwright/test'

// DD-269 — Deeplink-Flow `/catch/<slug>` auf der Issue-Catcher-PWA.
// Touchpunkte: hostnameRouter, CaptureView (Pinned-Mode, 404-Page),
// ProjectSettings TesterLinkCard.
//
// Diese Tests sind hostnamen-sensitiv: die Pinned-Logik greift nur, wenn der
// Browser den Host `issues.familie-riedel.org` sieht (HOST_VIEW_MAP → CAPTURE).
// Lokal läuft der Dev-Server unter `localhost` → AppShell-Whitelist → Tests
// werden geskippt, wenn weder eine Hostname-Override noch ein Deeplink möglich
// ist. Für CI/NAS-Smoke: E2E_BASE_URL=https://issues.familie-riedel.org setzen.

test.describe('DD-269 — /catch/<slug> Deeplink', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!baseURL || !/issues\./.test(baseURL)) {
      test.skip(true, 'Pinned-Flow benötigt issues.* host (E2E_BASE_URL setzen)')
    }
  })

  test('valid slug → CaptureView Pinned, Selector read-only mit Locked-Hint (R2)', async ({ page }) => {
    await page.goto('/catch/devd')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Issue erfassen/)

    // DD-269 Round 2: Selector ist sichtbar (voreingestellt) aber nicht änderbar.
    const sel = page.getByTestId('capture-project-locked')
    await expect(sel).toBeVisible()
    await expect(sel).toBeDisabled()
    await expect(sel).toHaveAttribute('aria-readonly', 'true')
    await expect(page.getByTestId('capture-project-locked-hint')).toBeVisible()

    // Type-Selector + Erklärungs-Subline auch im pinned-Mode.
    await expect(page.getByTestId('capture-type-selector')).toBeVisible()
    await expect(page.getByTestId('capture-type-desc')).toBeVisible()

    await expect(page.getByLabel('Titel *')).toBeVisible()
  })

  test('unknown slug → 404-Page mit Link zur globalen Erfassung', async ({ page }) => {
    await page.goto('/catch/unknownproject')
    await expect(page.getByTestId('catch-slug-404')).toBeVisible()
    await expect(page.getByRole('link', { name: /globalen Erfassung/i })).toBeVisible()
  })

  test('root path / → globaler Selector sichtbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('Projekt *')).toBeVisible()
  })

  test('pinned + submit → Issue erfasst (Backend-Echo)', async ({ page }) => {
    await page.goto('/catch/devd')
    await page.getByLabel('Titel *').fill(`E2E DD-269 Smoke ${Date.now()}`)
    await page.getByRole('button', { name: /Erfassen/ }).click()
    await expect(page.getByRole('status')).toContainText(/Erfasst:/i, { timeout: 10_000 })
  })
})
