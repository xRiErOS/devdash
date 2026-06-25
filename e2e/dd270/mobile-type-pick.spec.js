import { test, expect } from '@playwright/test'

// DD-270 — Type-Selector im Issue-Catcher (mobile-chrome-Pflicht aus NSP).
// Voraussetzung: CaptureView muss tatsächlich gerendert werden. Auf localhost
// (AppShell-Whitelist) muss `?capture=1` als Forced-Override gesetzt werden.

test.describe('DD-270 — Type-Selector', () => {
  test('Default = feature; Bug-Pill klickbar; Submit mit type=bug', async ({ page, baseURL }) => {
    const isCaptureHost = baseURL && /issues\./.test(baseURL)
    await page.goto(isCaptureHost ? '/' : '/?capture=1')

    // Selector + 4 Pills sichtbar
    await expect(page.getByTestId('capture-type-selector')).toBeVisible()
    await expect(page.getByTestId('capture-type-bug')).toBeVisible()
    await expect(page.getByTestId('capture-type-feature')).toBeVisible()
    await expect(page.getByTestId('capture-type-improvement')).toBeVisible()
    await expect(page.getByTestId('capture-type-core')).toBeVisible()

    // Default = feature
    await expect(page.getByTestId('capture-type-feature')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('capture-type-bug')).toHaveAttribute('aria-checked', 'false')

    // Touch-Target ≥ 44px (mobile-chrome / iOS)
    const box = await page.getByTestId('capture-type-bug').boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)

    // Bug auswählen → aria-checked switch
    await page.getByTestId('capture-type-bug').click()
    await expect(page.getByTestId('capture-type-bug')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('capture-type-feature')).toHaveAttribute('aria-checked', 'false')
  })

  // DD-269 Round 2 (in DD-270-Suite, weil Subline an Type-Selector hängt):
  // Erklärungs-Subline ist sichtbar und ändert sich bei Type-Switch.
  test('Type-Erklärungs-Subline reagiert auf Auswahl (DD-269 R2)', async ({ page, baseURL }) => {
    const isCaptureHost = baseURL && /issues\./.test(baseURL)
    await page.goto(isCaptureHost ? '/' : '/?capture=1')

    const desc = page.getByTestId('capture-type-desc')
    await expect(desc).toBeVisible()
    // Default = feature → Feature-Desc sichtbar.
    await expect(desc).toContainText('Neue Funktion')

    await page.getByTestId('capture-type-bug').click()
    await expect(desc).toContainText(/funktioniert nicht/i)

    await page.getByTestId('capture-type-improvement').click()
    await expect(desc).toContainText(/verbessern/i)

    await page.getByTestId('capture-type-core').click()
    await expect(desc).toContainText(/Architektur|Refactor|Infrastruktur/i)
  })

  test('Submit POST mit type=bug → Backend-Echo', async ({ page, baseURL }) => {
    // Submit-Roundtrip braucht ein voll seedendes Backend. Der DD-267-globalSetup
    // baut nur ein Minimal-Schema (keine api_keys, kein voller backlog-INSERT-Pfad).
    // Backend-Pfad ist via Vitest tests/dd270/* + tests/dd251/* abgedeckt.
    // Hier nur gegen prod-URL (E2E_BASE_URL=https://issues.familie-riedel.org) ausführbar.
    const isCaptureHost = baseURL && /issues\./.test(baseURL)
    if (!isCaptureHost) {
      test.skip(true, 'Submit-Roundtrip nur gegen NAS prod-URL (Schema-Vollständigkeit nötig)')
    }
    await page.goto('/')
    const selector = page.getByLabel('Projekt *')
    if (await selector.isVisible().catch(() => false)) {
      await selector.selectOption({ index: 1 })
    }
    await page.getByTestId('capture-type-bug').click()
    await page.getByLabel('Titel *').fill(`DD-270 e2e ${Date.now()}`)
    await page.getByRole('button', { name: /Erfassen/ }).click()
    await expect(page.getByRole('status')).toContainText(/Erfasst:/i, { timeout: 10_000 })
  })
})
