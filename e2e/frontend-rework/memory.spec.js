import { test, expect } from '@playwright/test'

// Frontend-Rework Plan 04 Task 2 Step 1: Charakterisierungs-Netz fuer ProjectMemoryView.
// Nagelt das IST-Verhalten fest, BEVOR die View auf Sidebar/Stack/Cluster recomposed
// wird. Vier Garantien:
//  (1) Liste laedt (List-Endpoint, kein FTS5),
//  (2) Master-Detail: Klick auf Eintrag zeigt Detail rechts,
//  (3) Kategorie-Filter blendet auf eine Kategorie ein (List-Endpoint ?category=),
//  (4) Volltextsuche (FTS5 /search) filtert auf den Treffer.
// Seed: project_memories 601(architecture_decision/stable) 602(convention/stable)
//       603(session_note/volatile, summary enthaelt "Backlog").

test.describe('Memory — Charakterisierung (Plan 04 T2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/memories')
    await expect(page.getByTestId('memory-list')).toBeVisible({ timeout: 15000 })
  })

  test('Liste laedt alle Eintraege', async ({ page }) => {
    await expect(page.getByTestId('memory-row-601')).toBeVisible()
    await expect(page.getByTestId('memory-row-602')).toBeVisible()
    await expect(page.getByTestId('memory-row-603')).toBeVisible()
    await expect(page.locator('[data-testid^="memory-row-"]')).toHaveCount(3)
  })

  test('Master-Detail: Klick zeigt Detail rechts', async ({ page }) => {
    await page.getByTestId('memory-row-601').click()
    const detail = page.getByTestId('memory-detail')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText('Layout-Primitives statt inline-flex')
  })

  test('Kategorie-Filter blendet auf eine Kategorie ein', async ({ page }) => {
    await page.getByTestId('memory-category-filter').selectOption('session_note')
    await expect(page.getByTestId('memory-row-603')).toBeVisible()
    await expect(page.getByTestId('memory-row-601')).toHaveCount(0)
    await expect(page.getByTestId('memory-row-602')).toHaveCount(0)
  })

  test('Volltextsuche (FTS5) filtert auf den Treffer', async ({ page }) => {
    await page.getByTestId('memory-search').fill('Backlog')
    // Debounce 300ms → /api/project-memories/search?q=Backlog (FTS5 MATCH).
    await expect(page.getByTestId('memory-row-603')).toBeVisible()
    await expect(page.getByTestId('memory-row-601')).toHaveCount(0)
    await expect(page.getByTestId('memory-row-602')).toHaveCount(0)
  })
})
