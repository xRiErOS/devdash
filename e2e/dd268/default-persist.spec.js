import { test, expect } from '@playwright/test'

// DD-268 — Default-Projekt-Lock via localStorage in CaptureView.
// localhost ist AppShell — daher `?capture=1` für Forced-Override.

test.describe('DD-268 — Default-Projekt-Lock', () => {
  test('Default setzen, Reload, vorbelegt', async ({ page, baseURL }) => {
    const isCaptureHost = baseURL && /issues\./.test(baseURL)
    const captureUrl = isCaptureHost ? '/' : '/?capture=1'

    await page.goto(captureUrl)

    // Gear-Icon öffnen
    await page.getByTestId('capture-default-settings-toggle').click()
    await expect(page.getByTestId('capture-default-settings-panel')).toBeVisible()

    // Default auf ersten Eintrag setzen
    const select = page.getByTestId('capture-default-project-select')
    const firstId = await select.locator('option').nth(1).getAttribute('value')
    if (!firstId) throw new Error('keine Projekte verfügbar — Backend-Seed prüfen')
    await select.selectOption(firstId)

    // localStorage persistiert
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('capture-default-project-id')
    )
    expect(stored).toBe(firstId)

    // Reload → Project-Selector im Form-Body ist auf Default vorbelegt
    await page.reload()
    const formSelect = page.getByLabel('Projekt *')
    await expect(formSelect).toHaveValue(firstId)
  })

  test('Default löschen ("Kein Default") → leerer Selector nach Reload', async ({ page, baseURL }) => {
    const isCaptureHost = baseURL && /issues\./.test(baseURL)
    const captureUrl = isCaptureHost ? '/' : '/?capture=1'

    await page.goto(captureUrl)
    await page.getByTestId('capture-default-settings-toggle').click()

    const select = page.getByTestId('capture-default-project-select')
    const firstId = await select.locator('option').nth(1).getAttribute('value')
    await select.selectOption(firstId)
    await select.selectOption('')

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('capture-default-project-id')
    )
    expect(stored).toBeNull()

    await page.reload()
    const formSelect = page.getByLabel('Projekt *')
    await expect(formSelect).toHaveValue('')
  })
})
