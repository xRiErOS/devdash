import { test, expect } from '@playwright/test'

// T14 (DD-266 → DD-510 repoint): Playwright-Setup Smoke-Test.
// Bestätigt: dev-server + globalSetup-DB + Roadmap-Route + Spalten-Board liefert.
// Vormals gegen die Timeline-Cards-View (roadmap-v2 + milestone-cards-grid); seit
// dem Cutover gegen das Spalten-Board (roadmap-board.root + Milestone-Spalten).
test.describe('T14 — Playwright Setup Smoke (DD-510)', () => {
  test('Dev-Server läuft + /roadmap erreichbar + Milestone-Spalten gerendert', async ({ page }) => {
    await page.goto('/devd/roadmap')
    await expect(page.locator('[data-ui="roadmap-board.root"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-ui="roadmap-board.unassigned"]')).toBeVisible()
    // Mindestens die ersten 3 Milestone-Spalten aus dem Seed sind gemountet.
    await expect(page.locator('[data-ui="roadmap-board.column.1"]')).toBeVisible()
    await expect(page.locator('[data-ui="roadmap-board.column.2"]')).toBeVisible()
    await expect(page.locator('[data-ui="roadmap-board.column.3"]')).toBeVisible()
  })
})
