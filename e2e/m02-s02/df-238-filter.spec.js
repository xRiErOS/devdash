import { test, expect } from '@playwright/test'

// DD-238 (→ DD-510 repoint): Milestone-Status-Filter auf dem Spalten-Board.
// Vormals Timeline-Filter (filter-open/filter-all Toggle). Seit dem Cutover steuert
// ein FilterPopover→Select (roadmap-board.filter) die sichtbaren Milestone-Spalten
// nach Status. Default = „Nicht erledigt" (open) blendet `completed` aus (REQ-45).
//
// DD-510 Anpassung der Semantik: der neue open-Filter blendet NUR `completed` aus
// (nicht mehr `reached` wie die alte Timeline). Daher hier gegen den faktischen
// Status-Filter-Vertrag getestet, nicht gegen die alte reached-Heuristik.
//
// Seed-Spalten (id): M1 (open), 2 Alpha (active), 3 Beta (active), 4 Gamma (reached),
// 5 Auto (active).
test.describe('DD-238 — Milestone-Status-Filter (DD-510)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.column.2"]')).toBeVisible({ timeout: 15000 })
  })

  // Der Status-Filter ist ein custom Combobox (Select-Molecule), kein natives
  // <select>: Trigger öffnen, dann Option per data-ui="select.option.<value>" klicken.
  async function openFilter(page) {
    await page.locator('[data-ui="roadmap-board.filter"]').getByRole('button', { name: /Filter/ }).click()
    await expect(page.locator('[data-ui="roadmap-board.filter.status"]')).toBeVisible()
  }
  async function pickStatus(page, value) {
    await page.locator('[data-ui="roadmap-board.filter.status"] [data-ui="select.trigger"]').click()
    await page.locator(`[data-ui="select.option.${value}"]`).click()
  }

  test('Default = „Nicht erledigt" (open); aktive Spalten sichtbar', async ({ page }) => {
    await openFilter(page)
    await expect(page.locator('[data-ui="roadmap-board.filter.status"] [data-ui="select.value"]'))
      .toHaveText('Nicht erledigt')
    // open blendet nur `completed` aus → aktive Milestone-Spalten sichtbar.
    await expect(page.locator('[data-ui="roadmap-board.column.2"]')).toBeVisible()
    await expect(page.locator('[data-ui="roadmap-board.column.3"]')).toBeVisible()
  })

  test('Filter „Abgeschlossen" blendet alle Spalten aus (kein completed im Seed)', async ({ page }) => {
    await openFilter(page)
    await pickStatus(page, 'completed')
    // Keine completed-Milestones im Seed → keine Milestone-Spalte, Empty-Hinweis sichtbar.
    await expect(page.locator('[data-ui="roadmap-board.column.2"]')).toHaveCount(0)
    await expect(page.locator('[data-ui="roadmap-board.empty.milestones"]')).toBeVisible()
  })

  test('Filter „Aktiv" zeigt nur active-Spalten (open/reached ausgeblendet)', async ({ page }) => {
    await openFilter(page)
    await pickStatus(page, 'active')
    await expect(page.locator('[data-ui="roadmap-board.column.2"]')).toBeVisible()
    await expect(page.locator('[data-ui="roadmap-board.column.3"]')).toBeVisible()
    // M1 (open) + M4 (reached) sind keine active-Milestones → ausgeblendet.
    await expect(page.locator('[data-ui="roadmap-board.column.1"]')).toHaveCount(0)
    await expect(page.locator('[data-ui="roadmap-board.column.4"]')).toHaveCount(0)
  })
})
