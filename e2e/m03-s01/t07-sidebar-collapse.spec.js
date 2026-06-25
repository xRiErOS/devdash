import { test, expect } from '@playwright/test'

// DD-284 (M3-S02 T07) — Sidebar-Collapse: Toggle blendet die OverviewTab-Aside ein/aus,
// State persistiert über Reload (localStorage devd:home:sidebar:2). Desktop-Viewport
// (1280) → Aside gerendert. Mutiert keine ToDo-DB.
// DD-486: OverviewTab ist self-contained mit eigener 340↔48px Aside (sidebar=null für
// overview tab → SettingsSidebar entfällt). Meta-Karte emittiert project-home.meta
// (ProjectMetaCard dataUiScope="${SCOPE}.meta"), nicht project-home.sidebar.meta.

const META = '[data-ui="project-home.meta"]'
// DD-472 T3 (Twin-Cutover): der Sidebar-Toggle lebt im ui/organisms-ProjectHomeTabs-Twin
// und trägt jetzt project-home.tabs.sidebar-toggle (vormals project-home.sidebar.head.toggle).
const TOGGLE = '[data-ui="project-home.tabs.sidebar-toggle"]'

test.describe('T07 — Sidebar-Collapse', () => {
  test('Case 9: Toggle klappt Sidebar ein (Meta-Sektion verschwindet, aria-pressed)', async ({ page }) => {
    await page.goto('/devd/home')
    await expect(page.locator(META)).toBeVisible({ timeout: 15000 })
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false')

    await page.locator(TOGGLE).click()
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(META)).toHaveCount(0)
  })

  test('Case 10: Collapsed-State persistiert über Reload', async ({ page }) => {
    await page.goto('/devd/home')
    await expect(page.locator(META)).toBeVisible({ timeout: 15000 })
    await page.locator(TOGGLE).click()
    await expect(page.locator(META)).toHaveCount(0)

    await page.reload()
    await expect(page.locator('[data-ui="project-home"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(META)).toHaveCount(0)

    const ls = await page.evaluate(() => window.localStorage.getItem('devd:home:sidebar:2'))
    expect(ls).toBe('1')
  })
})
