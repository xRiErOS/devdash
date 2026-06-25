import { test, expect } from '@playwright/test'

// DD-284 (M3-S02 T07) — Smoke: Project-Home-Navigation, Default-Tab, Tab-Switch,
// klickbare Issue-Pille → /issues/:id (PO-Reject-R3-Validierung).
// DD-487 (T02): SOLL-Tab-Set = Overview/Backlog/Roadmap/SSTD/Memories. Der Todo-Tab
// ist entfernt (ToDos leben als Overview-Card, DD-486) → Tab-Switch geht auf Memories,
// die Issue-Pille wird in der Overview-ToDos-Card geprüft.
test.describe('T07 — Project-Home Smoke', () => {
  test('Case 1: /devd/home lädt mit Default-Tab Overview + SOLL-Tab-Set (DD-487)', async ({ page }) => {
    await page.goto('/devd/home')
    await expect(page.locator('[data-ui="project-home"]')).toBeVisible({ timeout: 15000 })

    // DD-472 T3 (Twin-Cutover): der Tab-Button trägt jetzt project-home.tabs.tab.<id>
    // (ui/organisms-Twin), das Tabpanel weiterhin project-home.tabs.<id> (Tab-Komponente).
    const overview = page.locator('[data-ui="project-home.tabs.tab.overview"][role="tab"]')
    await expect(overview).toHaveAttribute('aria-selected', 'true')

    // SOLL-Tab-Set: 5 Tabs (Overview/Backlog/Roadmap/SSTD/Memories) vorhanden …
    for (const id of ['overview', 'backlog', 'roadmap', 'sstd', 'memory']) {
      await expect(page.locator(`[data-ui="project-home.tabs.tab.${id}"][role="tab"]`)).toBeVisible()
    }
    // … und Todo + Settings sind NICHT mehr Teil der Tab-Leiste.
    await expect(page.locator('[data-ui="project-home.tabs.tab.todo"][role="tab"]')).toHaveCount(0)
    await expect(page.locator('[data-ui="project-home.tabs.tab.settings"][role="tab"]')).toHaveCount(0)
  })

  test('Case 2: Tab-Switch auf Memories aktiviert tabpanel + setzt URL ?tab=memory', async ({ page }) => {
    await page.goto('/devd/home')
    await page.locator('[data-ui="project-home.tabs.tab.memory"][role="tab"]').click()

    await expect(page.locator('[data-ui="project-home.tabs.tab.memory"][role="tab"]')).toHaveAttribute('aria-selected', 'true')
    // Tabpanel-Wrapper (MemoryTab) + eingebettete ProjectMemoryView.
    await expect(page.locator('[data-ui="project-home.tabs.memory"][role="tabpanel"]')).toBeVisible()
    await expect(page.locator('[data-ui="project-memory.view"]')).toBeVisible({ timeout: 10000 })
    expect(page.url()).toContain('tab=memory')
  })

  test('Case 3: Issue-Pille in der Overview-ToDos-Card ist klickbar → navigate /issues/900 (R3-Reject-Fix)', async ({ page }) => {
    await page.goto('/devd/home')
    await expect(page.locator('[data-ui="project-home.tabs.overview"][role="tabpanel"]')).toBeVisible({ timeout: 15000 })
    const pill = page.locator('[data-ui="sortable-todo-item.issue-pill"]').first()
    await expect(pill).toBeVisible({ timeout: 10000 })
    await expect(pill).toHaveText('DD-999')

    await pill.click()
    await expect(page).toHaveURL(/\/issues\/900/)
  })
})
