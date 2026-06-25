import { test, expect, request } from '@playwright/test'

const API = process.env.E2E_BASE_URL || 'http://localhost:5567'

async function clearAllDependencies() {
  const ctx = await request.newContext()
  const milestones = await ctx.get(`${API}/api/milestones?status=all`, { headers: { 'X-Project-Id': '2' } }).then(r => r.json())
  for (const m of milestones) {
    if (m.id == null) continue
    const deps = await ctx.get(`${API}/api/milestones/${m.id}/dependencies`, { headers: { 'X-Project-Id': '2' } }).then(r => r.json())
    for (const s of (deps.successors ?? [])) {
      await ctx.delete(`${API}/api/milestone-dependencies/${s.dependency_id}`, { headers: { 'X-Project-Id': '2' } })
    }
  }
  await ctx.dispose()
}

// T10 (DD-262): Dependency-Editor mit Cycle-Toast.
test.describe('T10 — Dependency-Editor', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllDependencies()
    // DD-510: Timeline-Cards-View entfallen. Dependency-Editor lebt in
    // MilestoneDetail — direkt anspringen (E2E-M-Alpha = Seed id 2).
    await page.goto('/devd/milestones/2')
    await expect(page.locator('[data-testid="milestone-detail"]')).toBeVisible({ timeout: 15_000 })
  })

  test.afterAll(async () => {
    await clearAllDependencies()
  })

  test('Predecessor + Successor Sections sichtbar mit Dropdowns', async ({ page }) => {
    await expect(page.getByTestId('predecessors-section')).toBeVisible()
    await expect(page.getByTestId('successors-section')).toBeVisible()
    await expect(page.getByTestId('predecessor-select')).toBeVisible()
    await expect(page.getByTestId('successor-select')).toBeVisible()
  })

  test('Successor anlegen + entfernen', async ({ page }) => {
    const select = page.getByTestId('successor-select')
    await select.selectOption({ label: 'E2E-M-Beta' })
    await page.getByTestId('successor-add-button').click()
    await expect(page.getByTestId('successor-E2E-M-Beta')).toBeVisible()

    await page.getByTestId('successor-remove-E2E-M-Beta').click()
    await page.waitForTimeout(300)
    await expect(page.getByTestId('successor-E2E-M-Beta')).toHaveCount(0)
  })

  test('Cycle-Toast erscheint bei zyklischem Add', async ({ page }) => {
    // Alpha → Beta anlegen
    await page.getByTestId('successor-select').selectOption({ label: 'E2E-M-Beta' })
    await page.getByTestId('successor-add-button').click()
    await page.waitForTimeout(200)

    // Detail wechseln zu Beta (Seed id 3).
    await page.goto('/devd/milestones/3')
    await expect(page.locator('[data-testid="milestone-detail"]')).toBeVisible({ timeout: 15_000 })

    // Beta → Alpha anlegen (würde Cycle erzeugen)
    await page.getByTestId('successor-select').selectOption({ label: 'E2E-M-Alpha' })
    await page.getByTestId('successor-add-button').click()

    await expect(page.getByTestId('dependency-toast')).toBeVisible()
    await expect(page.getByTestId('dependency-toast')).toContainText(/Zyklus/i)
  })
})
