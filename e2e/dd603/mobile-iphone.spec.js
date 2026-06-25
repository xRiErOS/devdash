import { test, expect } from '@playwright/test'

// DD-603 (M5d) — Mobile-View-Regression iPhone 14 Pro (393×852, DPR 3).
//
// Automatisierte Mobile-Absicherung über die Kernscreens (Projekt-Home, Roadmap/
// Board, Backlog, Meilenstein-Details, Issue-Details, Suche). Prüft drei Klassen
// von Mobile-Regression:
//   1. Layout-Overflow  — kein horizontaler Page-Scroll (scrollWidth ≤ clientWidth).
//                         Stärkster Guard: fängt Bleed/zu-breite-Container.
//   2. Touch-Targets    — die kanonischen Mobile-Primärziele (App-Shell-Bottom-Tab,
//                         <lg sichtbar) sind ≥44px hoch (Daumen-Zone, DD-534).
//   3. Safe-Area        — die Bottom-Tab-Bar trägt die safe-area-Klasse (pb-safe-bar,
//                         LAY-04). env(safe-area-inset) ist headless 0 (kein Notch-
//                         Emulator) → Klassen-Präsenz + Overflow-Freiheit = Proxy.
//
// Läuft NUR im Projekt `mobile-iphone-dd603` (playwright.config.js, iPhone-14-Pro-
// Device-Descriptor, Viewport hart 393×852). Fixtures: project devd (id 2), Issue
// id 900 (DD-999), Milestone id 1, gegen die isolierte E2E-DB (devd.dd267-e2e.db).

const SLUG = 'devd'

// Kernscreens: route + Lade-Anker (deterministisches Settle vor der Messung).
const SCREENS = [
  { name: 'Projekt-Home', path: `/${SLUG}/home`, ready: '[data-ui="project-home"]' },
  { name: 'Roadmap/Board', path: `/${SLUG}/board`, ready: '[data-ui="app-shell.sub-header"]' },
  { name: 'Backlog', path: `/${SLUG}/backlog`, ready: '[data-ui="app-shell.sub-header"]' },
  { name: 'Meilenstein-Details', path: `/${SLUG}/milestones/1`, ready: '[data-testid="milestone-detail"]' },
  { name: 'Issue-Details', path: `/${SLUG}/issues/900`, ready: '[data-ui="issue-detail"]' },
]

// Toleranz: sub-pixel-Rundung (DPR3) → 1px erlaubt, echte Overflows sind ≫1px.
const OVERFLOW_TOLERANCE = 1

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    docScroll: document.documentElement.scrollWidth,
    docClient: document.documentElement.clientWidth,
    bodyScroll: document.body.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(
    metrics.docScroll,
    `${label}: document scrollWidth ${metrics.docScroll} > clientWidth ${metrics.docClient} (horizontaler Overflow)`,
  ).toBeLessThanOrEqual(metrics.docClient + OVERFLOW_TOLERANCE)
  expect(
    metrics.bodyScroll,
    `${label}: body scrollWidth ${metrics.bodyScroll} > innerWidth ${metrics.innerWidth} (Content-Bleed)`,
  ).toBeLessThanOrEqual(metrics.innerWidth + OVERFLOW_TOLERANCE)
}

test.describe('DD-603 — Kernscreens ohne Layout-Overflow @393', () => {
  test('Viewport = iPhone 14 Pro (393 breit)', async ({ page }) => {
    await page.goto(`/${SLUG}/home`)
    const vp = page.viewportSize()
    expect(vp?.width).toBe(393)
  })

  for (const screen of SCREENS) {
    test(`${screen.name} — kein horizontaler Overflow`, async ({ page }) => {
      await page.goto(screen.path)
      await expect(page.locator(screen.ready).first()).toBeVisible({ timeout: 15000 })
      await assertNoHorizontalOverflow(page, screen.name)
    })
  }

  // Suche = view-gescopter Sub-Header-Filter (DD-634), <lg in der Daumen-Zone.
  test('Suche — Sub-Header-Filter erreichbar, kein Overflow bei aktiver Eingabe', async ({ page }) => {
    await page.goto(`/${SLUG}/backlog`)
    const search = page.locator('[data-ui="app-shell.sub-header.search"]')
    await expect(search).toBeVisible({ timeout: 15000 })
    await search.fill('E2E')
    await expect(page.locator('[data-ui="app-shell.sub-header.search-clear"]')).toBeVisible()
    await assertNoHorizontalOverflow(page, 'Suche (Backlog-Filter aktiv)')
  })
})

test.describe('DD-603 — Mobile-Primärnavigation: Touch-Targets + Safe-Area', () => {
  test('App-Shell-Bottom-Tab <lg sichtbar, jeder Tab ≥44px, safe-area-Klasse', async ({ page }) => {
    await page.goto(`/${SLUG}/board`)
    const nav = page.locator('[data-ui="app-shell.bottom-tab.nav"]')
    await expect(nav).toBeVisible({ timeout: 15000 })

    // Safe-Area (LAY-04): Bar trägt pb-safe-bar (env(safe-area-inset-bottom)).
    await expect(nav).toHaveClass(/pb-safe-bar/)

    // Touch-Targets: jeder Bottom-Tab ≥44px hoch (Daumen-Zone, DD-534).
    // first() auto-wartet auf den Render (count() selbst wartet nicht → Race).
    const tabs = page.locator('[data-ui^="app-shell.bottom-tab.tab."]')
    await expect(tabs.first()).toBeVisible({ timeout: 10000 })
    const count = await tabs.count()
    expect(count, 'Bottom-Tab-Bar hat Primärnav-Ziele').toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox()
      expect(box?.height ?? 0, `Bottom-Tab #${i} Touch-Target-Höhe`).toBeGreaterThanOrEqual(44)
    }
  })

  // Dedizierte Mobile-Detailseiten (DD-635/DD-594): Back-Arrow ist ein ≥44px-Ziel.
  test('Issue-Detail-Back-Arrow @393 ist ≥44px Touch-Target', async ({ page }) => {
    await page.goto(`/${SLUG}/issues/900`)
    const back = page.locator('[data-ui="app-shell.detail.back"]')
    await expect(back).toBeVisible({ timeout: 15000 })
    const box = await back.boundingBox()
    expect(box?.height ?? 0, 'Back-Arrow Höhe').toBeGreaterThanOrEqual(44)
    expect(box?.width ?? 0, 'Back-Arrow Breite').toBeGreaterThanOrEqual(44)
  })
})
