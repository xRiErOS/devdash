import { test, expect } from '@playwright/test'
import { openIssueCreateModal } from '../_fixtures/keyboardModal.js'

// DD-271 — Tag-Picker ARIA-Combobox mit Pfeiltasten-Navigation.
// Acceptance:
//   - ArrowDown/ArrowUp markiert Option (aria-selected wandert)
//   - Enter uebernimmt aktuell markierte Option
//   - Esc schliesst Picker ohne Selektion
//   - aria-controls + aria-activedescendant verbinden Combobox + Listbox

test.describe('DD-271 · TagMultiSelect Keyboard-Navigation', () => {
  test('ArrowDown markiert, Enter selektiert, Highlight wandert', async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.root"]'))
      .toBeVisible({ timeout: 15_000 })

    // Issue-Create-Modal oeffnen via "c" (DD-472 B05: Helper deckt das Mount-Race ab).
    await openIssueCreateModal(page)

    // Tag-Combobox finden (im Modal). Modal kann doppelt offen sein (pre-existing
    // Dual-Modal-Bug aus DD-272-Spec) — wir nehmen die erste sichtbare Combobox.
    // DD-496: der Header trägt jetzt eine globale Such-Combobox → die Tag-Combobox
    // strikt im Modal-Dialog suchen, nicht global per .first().
    const combo = page.getByRole('dialog').first().getByRole('combobox').first()
    await expect(combo).toBeVisible()
    await expect(combo).toHaveAttribute('aria-expanded', 'false')

    // Type-ahead-Query
    await combo.click()
    await combo.fill('ux')
    await expect(combo).toHaveAttribute('aria-expanded', 'true')

    // Listbox via aria-controls verbunden
    const listboxId = await combo.getAttribute('aria-controls')
    expect(listboxId).toBeTruthy()
    const listbox = page.locator(`#${listboxId}`)
    await expect(listbox).toHaveAttribute('role', 'listbox')

    // 3 Tag-Optionen ux-* + Create-Suggestion ("+ ux anlegen") = 4.
    const options = listbox.locator('[role="option"]')
    await expect(options).toHaveCount(4)

    // Initial-Highlight liegt auf Index 0 (ux-deferred — alphabetisch erste).
    // aria-activedescendant zeigt auf eine Option im Listbox.
    let active = await combo.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    await expect(listbox.locator(`#${active}`)).toHaveAttribute('aria-selected', 'true')

    // ArrowDown 1× → Index 1
    await combo.press('ArrowDown')
    const active1 = await combo.getAttribute('aria-activedescendant')
    expect(active1).not.toBe(active)
    await expect(listbox.locator(`#${active1}`)).toHaveAttribute('aria-selected', 'true')

    // Auf eine echte Tag-Option zielen (Index 1 = zweite Tag-Option).
    // Innertext enthaelt zusaetzlich den usage_count (z.B. "ux-polish\n0×") —
    // wir extrahieren den reinen Tag-Namen aus der ersten Zeile.
    const rawText1 = await listbox.locator(`#${active1}`).innerText()
    const activeText1 = rawText1.split('\n')[0].trim()

    // Enter selektiert die markierte Option — als Tag-Chip im Modal sichtbar.
    await combo.press('Enter')
    // Chip ist ein span mit Tag-Name (ohne Listbox).
    // Modal enthaelt die Chip als sibling vor dem Input.
    const modal = page.getByRole('heading', { name: 'Neues Issue erstellen' })
      .first()
      .locator('xpath=ancestor::*[@role="dialog"]')
    await expect(modal.getByText(activeText1, { exact: false })).toBeVisible()

    // Combobox-Query ist nach Selektion leer; Fokus bleibt im Input.
    await expect(combo).toHaveValue('')
    await expect(combo).toBeFocused()
  })

  test('Esc schliesst Listbox (aria-expanded=false)', async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.root"]'))
      .toBeVisible({ timeout: 15_000 })

    await openIssueCreateModal(page)

    // DD-496: der Header trägt jetzt eine globale Such-Combobox → die Tag-Combobox
    // strikt im Modal-Dialog suchen, nicht global per .first().
    const combo = page.getByRole('dialog').first().getByRole('combobox').first()
    await combo.click()
    await combo.fill('ux')
    await expect(combo).toHaveAttribute('aria-expanded', 'true')

    await combo.press('Escape')
    await expect(combo).toHaveAttribute('aria-expanded', 'false')
    // Listbox verschwindet aus dem DOM (open=false branch).
    const listboxId = await combo.getAttribute('aria-controls')
    if (listboxId) {
      await expect(page.locator(`#${listboxId}`)).toHaveCount(0)
    }
  })

  test('ArrowUp wrappt am oberen Ende (Wrap-Around)', async ({ page }) => {
    await page.goto('/devd/board')
    await expect(page.locator('[data-ui="roadmap-board.root"]'))
      .toBeVisible({ timeout: 15_000 })

    await openIssueCreateModal(page)

    // DD-496: der Header trägt jetzt eine globale Such-Combobox → die Tag-Combobox
    // strikt im Modal-Dialog suchen, nicht global per .first().
    const combo = page.getByRole('dialog').first().getByRole('combobox').first()
    await combo.click()
    await combo.fill('ux')
    const listboxId = await combo.getAttribute('aria-controls')
    const listbox = page.locator(`#${listboxId}`)
    // Tags asynchron geladen — warten bis 3 Tag-Optionen + Create-Suggestion da sind.
    await expect(listbox.locator('[role="option"]')).toHaveCount(4)

    const initial = await combo.getAttribute('aria-activedescendant')
    // ArrowUp am Index 0 → wrappt auf letzten Index (Create-Suggestion am Ende).
    await combo.press('ArrowUp')
    const afterUp = await combo.getAttribute('aria-activedescendant')
    expect(afterUp).not.toBe(initial)
    await expect(listbox.locator(`#${afterUp}`)).toHaveAttribute('aria-selected', 'true')
  })
})
