import { test, expect } from '@playwright/test'

// Frontend-Rework Plan 04 Task 3 Step 1: Charakterisierungs-Netz fuer ItemDetail
// (Command-Center, Route /devd/issues/:id). Nagelt das IST-Verhalten fest, BEVOR
// die 2181-LOC-View auf Stack/Sidebar/Card recomposed wird. Vier Garantien:
//  (1) Issue laedt (Titel sichtbar),
//  (2) Tab-Wechsel Details/Sub-Tasks/Reviews/Aktivitaet + localStorage-Persistenz
//      (Keyboard 1-4 ist im Command-Center NICHT verdrahtet — `if(!embedded)return`
//       in der Shortcut-useEffect; daher hier bewusst nicht getestet),
//  (3) DD-681 (r4): Titel ist in den app-shell.sub-header gehoist (read-only,
//      uniform mit allen Views) — kein editierbarer Titel mehr im Desktop-Pane-Header,
//  (4) Status-Transition mit Cancel-Notes-Flow (Pflicht-Begruendung).
// Seed (global-setup): backlog 900 'E2E Linked Issue' status=new; 2 Subtasks
// (920 open / 921 done), 1 Review-Runde (930, notes 'E2E Review Note'), 2 Audit-
// Eintraege (940 create / 941 edit), 1 Dependency (950 → 901).

const subHeaderTitle = (page) => page.locator('[data-ui="app-shell.sub-header.title"]')

test.describe('ItemDetail — Charakterisierung (Plan 04 T3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/issues/900')
    await expect(subHeaderTitle(page)).toBeVisible({ timeout: 15000 })
  })

  test('Issue laedt mit Titel im Sub-Header', async ({ page }) => {
    // DD-681 (r4): der Titel steht im app-shell.sub-header, nicht mehr im Pane-Header.
    await expect(subHeaderTitle(page)).toContainText('E2E Linked Issue')
    // Default-Tab = Details.
    await expect(page.getByTestId('item-tab-details')).toHaveAttribute('aria-selected', 'true')
  })

  test('Tab-Wechsel + localStorage-Persistenz', async ({ page }) => {
    await page.getByTestId('item-tab-tasks').click()
    await expect(page.getByText('E2E Subtask Open')).toBeVisible()

    await page.getByTestId('item-tab-reviews').click()
    await expect(page.getByText('E2E Review Note')).toBeVisible()

    await page.getByTestId('item-tab-activity').click()
    await expect(page.getByText('Bearbeitet')).toBeVisible()

    // localStorage 'devd-item-tab' haelt den Tab ueber Reload.
    await page.reload()
    await expect(subHeaderTitle(page)).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('item-tab-activity')).toHaveAttribute('aria-selected', 'true')
  })

  test('Titel read-only im Sub-Header (DD-681 r4, kein Desktop-Inline-Edit)', async ({ page }) => {
    // Der Titel ist gehoist und read-only — kein editierbares item-detail-title-Feld
    // mehr im Desktop-Pane-Header.
    await expect(subHeaderTitle(page)).toContainText('E2E Linked Issue')
    await expect(page.getByTestId('item-detail-title')).toHaveCount(0)
  })

  test('Status-Transition mit Cancel-Notes-Flow', async ({ page }) => {
    // Forward-Transition new→refined ist sichtbar.
    await expect(page.getByTestId('item-transition-refined')).toBeVisible()

    // Stornieren oeffnet Pflicht-Begruendung; Confirm bleibt bis Eingabe disabled.
    await page.getByTestId('item-cancel').click()
    await expect(page.getByTestId('item-cancel-notes')).toBeVisible()
    await expect(page.getByTestId('item-cancel-confirm')).toBeDisabled()

    await page.getByTestId('item-cancel-notes').fill('E2E Storno-Grund')
    await expect(page.getByTestId('item-cancel-confirm')).toBeEnabled()
    await page.getByTestId('item-cancel-confirm').click()

    // Nach Storno ist Status terminal → Cancel-Button verschwindet (canCancel=false).
    await expect(page.getByTestId('item-cancel')).toHaveCount(0)
  })
})
