import { test, expect } from '@playwright/test'

// DD-510 (DD#62): e2e-Charakterisierung der Drilldown-Navigation + DnD auf dem
// Spalten-Board. Vormals (DD-466) über drei Modi (Sprint/Swimlane/Timeline) des
// alten Containers gefahren — diese Modi sind mit dem Cutover ersetzt durch die
// EINE Milestone-Spalten-View. Alle drei Board-Routen (board/milestones/roadmap)
// mounten jetzt dasselbe Spalten-Board.
//
// DD-510 struck (aus dieser Spec entfernt — PO-Parity-Liste):
//  - Mode-Switch via SegmentedControl (roadmap-mode-*) + per-Modus-Body-Asserts
//    (sprint-board / swimlane-mode / roadmap-v2) — STRUCK (kein Modus-Switch mehr).
//
// Behalten/portiert auf den Spalten-Vertrag:
//  1. Alle drei Routen mounten das Spalten-Board (roadmap-board.root).
//  2. Drilldown-Ziele: Card→/sprints/:id, Issue-Row→/issues/:id, Spaltenkopf→
//     /milestones/:id.
//  3. DnD: Spalten-Reorder via Spalten-Grip → PATCH /api/milestones/reorder.
//
// Seed (e2e/_fixtures/global-setup.js, project devd=2): Milestone 1 (open, pos 1)
// trägt Sprint 101 (planning); Sprint 101 trägt Issue 904. Milestones 2..5
// (E2E-M-Alpha/Beta/Gamma/Auto) ohne Sprints — Alpha=Spalte 2, Beta=Spalte 3.

test.describe('DD-510 — alle Board-Routen mounten das Spalten-Board', () => {
  for (const route of ['/devd/board', '/devd/milestones', '/devd/roadmap']) {
    test(`Route ${route} rendert roadmap-board.root`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('[data-ui="roadmap-board.root"]')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-ui="roadmap-board.column.1"]')).toBeVisible({ timeout: 15000 })
    })
  }
})

test.describe('DD-510 — Drilldown-Ziele einheitlich', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.column.1"]')).toBeVisible({ timeout: 15000 })
  })

  test('Sprint-Card → /sprints/:id', async ({ page }) => {
    await page.locator('[data-ui="roadmap-board.card.101.open"]').click()
    await expect(page).toHaveURL(/\/devd\/sprints\/101$/)
  })

  test('Card-Expand → Issue-Row → /issues/:id', async ({ page }) => {
    await page.locator('[data-ui="roadmap-board.card.101.expand"]').click()
    await page.locator('[data-ui="roadmap-board.card.101.issues.row.904"]').click()
    await expect(page).toHaveURL(/\/devd\/issues\/904$/)
  })

  test('Spaltenkopf → /milestones/:id', async ({ page }) => {
    await page.locator('[data-ui="roadmap-board.column.1.open"]').click()
    await expect(page).toHaveURL(/\/devd\/milestones\/1$/)
  })
})

test.describe('DD-510 — DnD: Spalten-Reorder via Spalten-Grip', () => {
  test('Drag Spalten-Grip sendet PATCH /api/milestones/reorder', async ({ page }) => {
    await page.goto('/devd/board')
    // Spalten 2 (E2E-M-Alpha) + 3 (E2E-M-Beta) sind benachbart und ohne Sprints —
    // sauberes Drop-Ziel-Paar für den Spalten-Reorder.
    const handleA = page.locator('[data-ui="roadmap-board.column.2.drag-handle"]')
    const handleB = page.locator('[data-ui="roadmap-board.column.3.drag-handle"]')
    await expect(handleA).toBeVisible({ timeout: 15000 })
    await expect(handleB).toBeVisible()
    const a = await handleA.boundingBox()
    const b = await handleB.boundingBox()
    if (!a || !b) throw new Error('Spalten-Grip nicht erreichbar')
    const reorderReq = page.waitForRequest(
      (req) => req.url().includes('/api/milestones/reorder') && req.method() === 'PATCH',
      { timeout: 15000 },
    )
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(a.x + a.width / 2 + 30, a.y + a.height / 2, { steps: 5 })
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 5, { steps: 10 })
    await page.mouse.up()
    const req = await reorderReq
    expect(Array.isArray(req.postDataJSON().ordered_ids)).toBe(true)
  })
})
