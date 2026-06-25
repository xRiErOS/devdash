import { test, expect } from '@playwright/test'

// DD-510 (DD#62): Charakterisierungs-Netz für das Spalten-Board (Route /devd/board).
// Der alte 3-Modi-Container (Sprint-Board/Swimlane/Timeline) ist ersetzt durch die
// EINE Milestone-Spalten-View (data-ui `roadmap-board.*`). Diese Spec ist auf den
// neuen Spalten-Vertrag umgeschrieben.
//
// DD-510 struck/deferred (aus dieser Spec entfernt — PO-Parity-Liste):
//  - Swimlane-Toggle (Modus-Switch) — STRUCK (kein Modus-Switch mehr).
//  - Cancelled-Spalte Collapse + Toolbar Issue/+Sprint/Sprint-Order — STRUCK/DEFERRED
//    (CancelledColumn + Sprint-Toolbar gehören nicht zum Spalten-Board-SOLL; das
//    bare CancelledColumn-Feature ist DEFERRED, separat getrackt).
//
// Kern-Flows (behalten, auf den neuen Vertrag portiert):
//  (1) Board lädt — Milestone-Spalten + Unassigned-Spalte sichtbar,
//  (2) Sprint-Card → Sprint-Details-Navigation (card.<id>.open, REQ-42),
//  (3) Card-Expand → Issue-Row → Issue-Details-Navigation (REQ-43),
//  (4) Spaltenkopf-Klick → Milestone-Details-Navigation,
//  (5) Milestone-Status-Filter vorhanden, Default „Nicht erledigt".
//
// Seed (e2e/_fixtures/global-setup.js): Milestone 1 'Roadmap V2 — Sprint Board Polish'
// (open, pos 1) trägt Sprint 101 'Pill Smoke' (planning); Sprint 101 trägt Issue 904
// 'E2E Sprint Issue'. Milestones 2..5 ohne Sprints. Unassigned-Spalte leer (Sprint 101
// hängt an Milestone 1).

test.describe('Roadmap-Board — Spalten-Board (DD-510)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/board')
    // Anker = BoardPage-Container (roadmap-board.board) + die erste Milestone-Spalte.
    await expect(page.locator('[data-ui="roadmap-board.root"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-ui="roadmap-board.column.1"]')).toBeVisible({ timeout: 15000 })
  })

  test('Board lädt mit Milestone-Spalten + Unassigned-Spalte', async ({ page }) => {
    // Unassigned-Spalte ganz links (immer gerendert).
    await expect(page.locator('[data-ui="roadmap-board.unassigned"]')).toBeVisible()
    // Milestone-Spalte 1 trägt ihren Namen im Spaltenkopf-Open-Button.
    await expect(page.locator('[data-ui="roadmap-board.column.1.open"]'))
      .toHaveText('Roadmap V2 — Sprint Board Polish')
    // Sprint-Card 101 lebt in Spalte 1.
    await expect(page.locator('[data-ui="roadmap-board.card.101"]')).toBeVisible()
    await expect(page.locator('[data-ui="roadmap-board.card.101.open"]')).toHaveText('Pill Smoke')
  })

  test('Sprint-Card → Sprint-Details (card.open, REQ-42)', async ({ page }) => {
    await page.locator('[data-ui="roadmap-board.card.101.open"]').click()
    await expect(page).toHaveURL(/\/devd\/sprints\/101$/)
  })

  test('Card-Expand → Issue-Row → Issue-Details (REQ-43)', async ({ page }) => {
    // Expand klappt die Issue-Liste der Card auf.
    await page.locator('[data-ui="roadmap-board.card.101.expand"]').click()
    const issueRow = page.locator('[data-ui="roadmap-board.card.101.issues.row.904"]')
    await expect(issueRow).toBeVisible()
    await expect(issueRow).toContainText('E2E Sprint Issue')
    await issueRow.click()
    await expect(page).toHaveURL(/\/devd\/issues\/904$/)
  })

  test('Spaltenkopf-Klick → Milestone-Details', async ({ page }) => {
    await page.locator('[data-ui="roadmap-board.column.1.open"]').click()
    await expect(page).toHaveURL(/\/devd\/milestones\/1$/)
  })

  test('Milestone-Status-Filter vorhanden (Default: Nicht erledigt)', async ({ page }) => {
    // Filter-Cluster im Toolbar-Slot.
    await expect(page.locator('[data-ui="roadmap-board.filter"]')).toBeVisible()
    // FilterPopover-Trigger öffnen → Status-Select (custom Combobox) zeigt den
    // Default-Label „Nicht erledigt" (value=open).
    await page.locator('[data-ui="roadmap-board.filter"]').getByRole('button', { name: /Filter/ }).click()
    await expect(page.locator('[data-ui="roadmap-board.filter.status"]')).toBeVisible()
    await expect(page.locator('[data-ui="roadmap-board.filter.status"] [data-ui="select.value"]'))
      .toHaveText('Nicht erledigt')
  })
})
