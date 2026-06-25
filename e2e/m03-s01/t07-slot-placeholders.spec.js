import { test, expect } from '@playwright/test'

// DD-284 (M3-S02 T07) — Slot-Platzhalter.
// DD-487 (B04): Sessions + Terminal Bottom-Slot ENTFERNT (obsolet, nicht Teil der
// SOLL-Story). Diese Spec ist jetzt ein Regressions-Guard: die Bottom-Slots dürfen
// auf KEINEM Viewport mehr im DOM erscheinen.

const SESSIONS = '[data-ui="project-home.bottom-slot.sessions"]'
const TERMINAL = '[data-ui="project-home.bottom-slot.terminal"]'
const BOTTOM_SLOT = '[data-ui="project-home.bottom-slot"]'

test.describe('T07 — Slot-Platzhalter entfernt (B04)', () => {
  test('Case 12: Desktop rendert KEINE Sessions-/Terminal-Bottom-Slots mehr', async ({ page }) => {
    await page.goto('/devd/home')
    await expect(page.locator('[data-ui="project-home"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator(SESSIONS)).toHaveCount(0)
    await expect(page.locator(TERMINAL)).toHaveCount(0)
    // Kein Layout-Loch: der Bottom-Slot-Grid-Container existiert ebenfalls nicht.
    await expect(page.locator(BOTTOM_SLOT)).toHaveCount(0)
  })

  test('Case 13: Mobile (375) rendert ebenfalls keine Bottom-Slots', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/devd/home')
    await expect(page.locator('[data-ui="project-home"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator(SESSIONS)).toHaveCount(0)
    await expect(page.locator(TERMINAL)).toHaveCount(0)
  })
})
