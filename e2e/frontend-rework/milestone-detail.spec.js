import { test, expect } from '@playwright/test'

// DD-442 (Frontend-Rework Plan 08) — Charakterisierungs-Netz fuer MilestoneDetail
// (Route /devd/milestones/:id). Nagelt das IST-Verhalten fest, BEVOR/WAEHREND die
// View auf den MasterDetail-Archetyp (sidebarVariant=meta) recomposed wird. Laeuft
// VOR dem Umbau gruen, danach UNVERAENDERT gruen (Parität).
//
// Seed (global-setup):
//   - Milestone M1 (id=1, project devd) 'Roadmap V2 — Sprint Board Polish',
//     status 'open', target_date 2026-12-31, mit Sprint 101 ('Pill Smoke',
//     status 'planning' → faellt in den 'open'-Tab).
//   - Milestone M5 (id=5) 'E2E-M-Auto', status 'active' → Status-Control
//     'Abschließen' (status-complete) sichtbar.
//
// Hinweis: MilestoneDetail hat BEWUSST KEINE localStorage-Tab-Persistenz und KEINE
// 1-N-Keyboard-Shortcuts (anders als ItemDetail). C4 ist die Anti-Regression dazu.

test.describe('MilestoneDetail — Charakterisierung (DD-442)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/milestones/1')
    await expect(page.getByTestId('milestone-detail-name')).toBeVisible({ timeout: 15000 })
  })

  test('C1 — Laden: Name + Pill sichtbar', async ({ page }) => {
    await expect(page.getByTestId('milestone-detail-name')).toContainText('Roadmap V2')
    await expect(page.getByTestId('milestone-detail-pill')).toContainText('M1')
  })

  test('C2 — Default-Tab = Offene Sprints', async ({ page }) => {
    await expect(page.getByTestId('milestone-detail-tab-open')).toHaveAttribute('aria-selected', 'true')
  })

  test('C3 — Tab-Wechsel verschiebt aria-selected', async ({ page }) => {
    await page.getByTestId('milestone-detail-tab-done').click()
    await expect(page.getByTestId('milestone-detail-tab-done')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('milestone-detail-tab-open')).toHaveAttribute('aria-selected', 'false')

    await page.getByTestId('milestone-detail-tab-all').click()
    await expect(page.getByTestId('milestone-detail-tab-all')).toHaveAttribute('aria-selected', 'true')
    // 'all' zeigt die Sprint-Karte (Sprint 101).
    await expect(page.getByTestId('milestone-detail-sprint-101')).toBeVisible()
  })

  test('C4 — KEINE Tab-Persistenz: Reload faellt auf open zurueck', async ({ page }) => {
    await page.getByTestId('milestone-detail-tab-done').click()
    await expect(page.getByTestId('milestone-detail-tab-done')).toHaveAttribute('aria-selected', 'true')
    await page.reload()
    await expect(page.getByTestId('milestone-detail-name')).toBeVisible({ timeout: 15000 })
    // Anti-Regression: Default 'open' ist wieder aktiv (kein localStorage).
    await expect(page.getByTestId('milestone-detail-tab-open')).toHaveAttribute('aria-selected', 'true')
  })

  test('C5 — Progress sichtbar mit %-Anzeige', async ({ page }) => {
    await expect(page.getByTestId('milestone-detail-progress')).toBeVisible()
    await expect(page.getByTestId('milestone-detail-progress')).toContainText('abgeschlossen')
  })

  test('C6 — Dependencies-Sektionen (in/out) rendern', async ({ page }) => {
    await expect(page.getByTestId('milestone-detail-deps-in')).toBeVisible()
    await expect(page.getByTestId('milestone-detail-deps-out')).toBeVisible()
  })

  test('C7 — Sprint-Mini-Bars: Klick navigiert zum Sprint', async ({ page }) => {
    await expect(page.getByTestId('milestone-detail-sprint-bars')).toBeVisible()
    await page.getByTestId('milestone-detail-sprint-bar-101').click()
    await expect(page).toHaveURL(/\/sprints\/101/)
  })

  test('C8 — Sprint-Card-Klick navigiert zum Sprint', async ({ page }) => {
    // Sprint 101 ('planning') liegt im open-Tab (Default).
    await page.getByTestId('milestone-detail-sprint-101').click()
    await expect(page).toHaveURL(/\/sprints\/101/)
  })

  test('C10 — Edit-URL-Sync: Bearbeiten setzt ?edit=1', async ({ page }) => {
    await page.getByTestId('milestone-detail-edit').click()
    await expect(page).toHaveURL(/[?&]edit=1/)
  })
})

test.describe('MilestoneDetail — Status-Control (DD-442 C9)', () => {
  test('C9 — active Milestone zeigt Abschließen-Control', async ({ page }) => {
    await page.goto('/devd/milestones/5')
    await expect(page.getByTestId('milestone-detail-name')).toBeVisible({ timeout: 15000 })
    // M5 ist 'active' → forward-only Control 'Abschließen' sichtbar.
    await expect(page.getByTestId('milestone-detail-status-complete')).toBeVisible()
  })
})
