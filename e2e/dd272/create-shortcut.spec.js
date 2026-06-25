import { test, expect } from '@playwright/test'
import { openIssueCreateModal } from '../_fixtures/keyboardModal.js'

// DD-272 — Hotkey "c" oeffnet New-Issue-Modal (vormals "n").
// Acceptance:
//   - "c" auf Roadmap oeffnet IssueCreateModal
//   - "n" hat keinen Effekt
//   - Help-Dialog ("?") zeigt "c" als Shortcut fuer "Neues Issue anlegen"

test.describe('DD-272 · Create-Issue Hotkey "c"', () => {
  test('"c" oeffnet Neues-Issue-Modal, "n" nicht', async ({ page }) => {
    // DD-408: Slug-Routing (DD-368) — `/` redirectet auf `/devd/home`. Der 'c'-Hotkey
    // ist global im Layout gebunden (DD-510: das Spalten-Board hat keinen eigenen
    // Board-Shortcut). Readiness-Anker = roadmap-board.root unter `/devd/board`.
    await page.goto('/devd/board')
    // Spalten-Board geladen
    await expect(page.locator('[data-ui="roadmap-board.root"]'))
      .toBeVisible({ timeout: 15_000 })

    // Sicherstellen: Fokus ist NICHT in einem Input (sonst feuert Hook nicht)
    await page.evaluate(() => document.activeElement?.blur?.())

    // Negativ-Probe: "n" oeffnet nichts mehr
    await page.keyboard.press('n')
    await page.waitForTimeout(150)
    const modalNach_N = page.getByRole('dialog', { name: /Neues Issue|Issue erstellen/i })
    await expect(modalNach_N).toHaveCount(0)
    // Heading-Fallback (role=dialog ohne aria-label)
    await expect(page.getByRole('heading', { name: 'Neues Issue erstellen' })).toHaveCount(0)

    // Positiv: "c" oeffnet das Modal (DD-472 B05: Helper deckt das Mount-Race ab).
    await openIssueCreateModal(page)
  })

  // DD-475 — Doppel-'c'-Hotkey: globaler (Layout) + (alter) Page-Handler feuerten beide
  // auf demselben keydown. DD-510: das Spalten-Board hat KEINEN eigenen Board-Handler
  // mehr (Shortcuts deferred) → nur der Layout-Handler feuert. Regressionsanker bleibt:
  // nach 'c' GENAU EIN role=dialog.
  test('"c" oeffnet GENAU EIN Modal auf Board (kein Doppel-Handler) — DD-475', async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.root"]'))
      .toBeVisible({ timeout: 15_000 })

    await openIssueCreateModal(page)
    await expect(page.getByRole('dialog')).toHaveCount(1)
  })

  test('"c" oeffnet GENAU EIN Modal auf Backlog (kein Doppel-Handler) — DD-475', async ({ page }) => {
    await page.goto('/devd/backlog')
    await page.waitForLoadState('networkidle')

    await openIssueCreateModal(page)
    await expect(page.getByRole('dialog')).toHaveCount(1)
  })

  test('Help-Dialog "?" listet "c" fuer Neues Issue', async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.root"]'))
      .toBeVisible({ timeout: 15_000 })

    await page.evaluate(() => document.activeElement?.blur?.())
    // Hook matcht direkt auf e.key === '?' — Shift+/ produziert das.
    // DD-472 B05: dasselbe Mount-Race wie beim 'c'-Hotkey → bis zum Timeout nachpressen.
    const heading = page.getByRole('heading', { name: 'Tastenkuerzel' })
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      await page.keyboard.down('Shift')
      await page.keyboard.press('Slash')
      await page.keyboard.up('Shift')
      if (await heading.count() > 0) break
      await page.waitForTimeout(120)
    }
    await expect(heading).toBeVisible({ timeout: 1500 })

    // Dialog-Container ueber den 2. Vorfahren des heading.
    const help = heading.locator('xpath=ancestor::*[@role="dialog"]')

    // Zeile "Neues Issue anlegen" plus <kbd>c</kbd>
    const row = help.locator('li', { hasText: 'Neues Issue anlegen' })
    await expect(row).toBeVisible()
    await expect(row.locator('kbd', { hasText: /^c$/ })).toBeVisible()
    // Negativ: kein <kbd>n</kbd> mehr in dieser Zeile
    await expect(row.locator('kbd', { hasText: /^n$/ })).toHaveCount(0)
  })
})
