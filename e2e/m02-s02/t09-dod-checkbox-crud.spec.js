import { test, expect } from '@playwright/test'

// T09 (DD-261): DoD-Checkbox + CRUD + Drag&Drop-Reorder.
test.describe('T09 — DoD-Liste CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // DD-510: Die Timeline-Cards-View (milestone-name-<name>) ist entfallen. Der
    // DoD-Editor lebt unverändert in MilestoneDetail — direkt anspringen
    // (E2E-M-Alpha = Seed-Milestone id 2), statt über das ersetzte Board zu klicken.
    await page.goto('/devd/milestones/2')
    await expect(page.locator('[data-testid="milestone-detail"]')).toBeVisible({ timeout: 15_000 })
  })

  test('DoD-Liste rendert seed-Items mit Checkbox-Status', async ({ page }) => {
    const list = page.locator('[data-testid^="dod-item-"]')
    await expect(list.first()).toBeVisible()
    const count = await list.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('Add + Toggle + Delete DoD-Item komplett funktional', async ({ page }) => {
    await expect(page.locator('[data-testid^="dod-item-"]').first()).toBeVisible()
    const beforeCount = await page.locator('[data-testid^="dod-item-"]').count()
    await page.getByTestId('dod-add-input').fill('E2E-test-item')
    await page.getByTestId('dod-add-button').click()
    await expect(page.locator('[data-testid^="dod-item-"]')).toHaveCount(beforeCount + 1)

    // Toggle erste Checkbox
    const firstCheckbox = page.locator('[data-testid^="dod-checkbox-"]').first()
    const initialChecked = await firstCheckbox.isChecked()
    await firstCheckbox.click()
    await page.waitForTimeout(200)
    await expect(firstCheckbox).toBeChecked({ checked: !initialChecked })

    // Delete via confirm dialog
    page.on('dialog', d => d.accept())
    const newItemRow = page.locator('[data-testid^="dod-item-"]').last()
    const newItemId = await newItemRow.getAttribute('data-testid')
    await page.locator(`[data-testid="${newItemId.replace('dod-item-', 'dod-delete-')}"]`).click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid^="dod-item-"]')).toHaveCount(beforeCount)
  })
})
