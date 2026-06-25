import { test, expect } from '@playwright/test'

// DD-284 (M3-S02 T07) — Mobile-Bottom-Nav: bei 375x667 rendert die fixierte
// Bottom-Nav (project-home.tabs.mobile); die Desktop-Tab-Bar entfällt.
// DD-486: OverviewTab rendert die Aside (project-home.meta) auch auf Mobile im DOM
// (kein viewport-bedingtes Conditional in OverviewTab) — der SettingsSidebar-Wrapper
// (project-home.sidebar) fehlt weiterhin, da sidebar=null auf dem overview-Tab.
test.use({ viewport: { width: 375, height: 667 } })

test.describe('T07 — Mobile-Bottom-Nav', () => {
  test('Case 11: 375px-Viewport zeigt Bottom-Nav, keine Desktop-Tab-Bar/Sidebar', async ({ page }) => {
    await page.goto('/devd/home')
    await expect(page.locator('[data-ui="project-home"]')).toBeVisible({ timeout: 15000 })

    // Mobile-Nav sichtbar + fixiert am unteren Rand.
    const mobileNav = page.locator('[data-ui="project-home.tabs.mobile"]')
    await expect(mobileNav).toBeVisible()
    const pos = await mobileNav.evaluate((el) => getComputedStyle(el).position)
    expect(pos).toBe('fixed')

    // Desktop-Tab-Bar NICHT gerendert (layout: {!isMobile && tabBar}).
    await expect(page.locator('[data-ui="project-home.tabs"]')).toHaveCount(0)
    // SettingsSidebar NICHT gerendert (sidebar=null auf overview-Tab, DD-486).
    // project-home.sidebar ist der OverviewTab-aside-Anker — SettingsSidebar-exklusive
    // Abschnitte wie sidebar.meta / sidebar.quick-settings existieren nicht.
    await expect(page.locator('[data-ui="project-home.sidebar.meta"]')).toHaveCount(0)
    await expect(page.locator('[data-ui="project-home.sidebar.quick-settings"]')).toHaveCount(0)
  })
})
