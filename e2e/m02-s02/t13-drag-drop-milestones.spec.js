import { test, expect, request } from '@playwright/test'

const API = process.env.E2E_BASE_URL || 'http://localhost:5567'

async function restoreDefaultOrder() {
  const ctx = await request.newContext()
  const milestones = await ctx.get(`${API}/api/milestones?status=all`, { headers: { 'X-Project-Id': '2' } }).then(r => r.json())
  const byName = Object.fromEntries(milestones.filter(m => m.id != null).map(m => [m.name, m.id]))
  const orderedIds = ['Roadmap V2 — Sprint Board Polish', 'E2E-M-Alpha', 'E2E-M-Beta', 'E2E-M-Gamma', 'E2E-M-Auto'].map(n => byName[n]).filter(Boolean)
  await ctx.patch(`${API}/api/milestones/reorder`, {
    data: { ordered_ids: orderedIds },
    headers: { 'X-Project-Id': '2', 'Content-Type': 'application/json' },
  })
  await ctx.dispose()
}

// T13 (DD-265 → DD-510 repoint): Milestone-Spalten Drag&Drop-Reorder via @dnd-kit.
// Vormals auf der Timeline-Cards-View (milestone-drag-handle-<name>); seit dem
// Spalten-Board-Cutover liegt der Reorder-Grip im Spaltenkopf
// (roadmap-board.column.<id>.drag-handle). Der PATCH-/api/milestones/reorder-Vertrag
// bleibt identisch. Seed-IDs: E2E-M-Alpha=2, E2E-M-Beta=3.
test.describe('T13 — Milestone-Spalten Drag&Drop (DD-510)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.column.2"]')).toBeVisible({ timeout: 15000 })
  })

  test.afterAll(async () => {
    await restoreDefaultOrder()
  })

  test('Spalten-Grips sichtbar', async ({ page }) => {
    await expect(page.locator('[data-ui="roadmap-board.column.2.drag-handle"]')).toBeVisible()
    await expect(page.locator('[data-ui="roadmap-board.column.3.drag-handle"]')).toBeVisible()
  })

  test('Drag Spalte 2 über Spalte 3 sendet PATCH /api/milestones/reorder', async ({ page }) => {
    // @dnd-kit PointerSensor benötigt PointerEvents (down/move/up) statt HTML5-DragEvents.
    const requestPromise = page.waitForRequest(req =>
      req.url().includes('/api/milestones/reorder') && req.method() === 'PATCH',
      { timeout: 15000 },
    )
    const handleAlpha = page.locator('[data-ui="roadmap-board.column.2.drag-handle"]')
    const handleBeta = page.locator('[data-ui="roadmap-board.column.3.drag-handle"]')

    const a = await handleAlpha.boundingBox()
    const b = await handleBeta.boundingBox()
    if (!a || !b) throw new Error('Spalten-Grips nicht erreichbar')

    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    // Activation-Constraint distance: 4px — größere Schritte ausgeben + slowMo via steps
    await page.mouse.move(a.x + a.width / 2 + 30, a.y + a.height / 2, { steps: 5 })
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 5, { steps: 10 })
    await page.mouse.up()

    const req = await requestPromise
    const body = req.postDataJSON()
    expect(Array.isArray(body.ordered_ids)).toBe(true)
    expect(body.ordered_ids.length).toBeGreaterThan(0)
  })
})
