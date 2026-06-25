import { test, expect } from '@playwright/test'

// Frontend-Rework Plan 04 Task 1 Step 1: Charakterisierungs-Netz fuer BacklogPage.
// Nagelt das IST-Verhalten fest, BEVOR die View auf Layout-Primitives recomposed
// wird. Drei Garantien:
//  (1) Liste laedt mit Default-Filter new+refined (DD-138),
//  (2) Status-Filter-Toggle blendet planned ein/aus (DD-138),
//  (3) Drag eines Issues auf einen Sprint-Chip weist zu — die Zeile verschwindet,
//      da zugewiesene Issues per Default ausgeblendet sind (DD-144).
// Seed: backlog 900(new) 901(refined) 902(planned) 903(new), sprint 101 planning.

// dnd-kit PointerSensor (activationConstraint distance:4) braucht echte Pointer-
// Schritte. Wichtig: DndContext nutzt Default-Collision (rectIntersection) ueber
// das breite DragOverlay (volle Row-Breite). Bei Center-Grab ueberdeckt das Overlay
// den linken "Backlog"-Chip staerker → falsches Droppable. Darum am LINKEN Rand
// (Grip-Handle) greifen: das Overlay haengt dann rechts vom Pointer und trifft den
// Ziel-Chip statt des links daneben liegenden none-Chips.
async function dragOnto(page, source, target) {
  const s = await source.boundingBox()
  const t = await target.boundingBox()
  const sx = s.x + 12
  const sy = s.y + s.height / 2
  const tx = t.x + 24
  const ty = t.y + t.height / 2
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  // Aktivierungsdistanz (>4px) ueberschreiten → onDragStart.
  await page.mouse.move(sx + 20, sy + 20, { steps: 6 })
  await page.waitForTimeout(50)
  // Zum Droppable ziehen; dnd-kit-Kollision braucht Pointermove ueber dem Ziel.
  await page.mouse.move(tx, ty, { steps: 20 })
  // Jiggle im Droppable, damit `over` sicher gesetzt wird.
  await page.mouse.move(tx + 4, ty + 4, { steps: 4 })
  await page.mouse.move(tx, ty, { steps: 4 })
  await page.waitForTimeout(80)
  await page.mouse.up()
  await page.waitForTimeout(300)
}

test.describe('Backlog — Charakterisierung (Plan 04 T1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/devd/backlog')
    await expect(page.getByTestId('backlog-list')).toBeVisible({ timeout: 15000 })
  })

  test('Liste laedt mit Default-Filter (new + refined)', async ({ page }) => {
    await expect(page.getByTestId('backlog-row-900')).toBeVisible() // new
    await expect(page.getByTestId('backlog-row-901')).toBeVisible() // refined
    await expect(page.getByTestId('backlog-row-903')).toBeVisible() // new
    await expect(page.getByTestId('backlog-row-902')).toHaveCount(0) // planned → gefiltert
    await expect(page.locator('[data-testid^="backlog-row-"]')).toHaveCount(3)
  })

  test('Status-Filter-Toggle blendet planned ein und aus', async ({ page }) => {
    await expect(page.getByTestId('backlog-row-902')).toHaveCount(0)
    // DD-529 R2: Status-Filter ist ein Multi-Select (TagMultiSelect) im Filter-Menü.
    // Filter-Menü öffnen → Status-Multi-Select öffnen → Option wählen; entfernen via Chip-×.
    await page.getByRole('button', { name: /Filter/ }).click()
    await page.locator('[data-ui="tag-multi-select.control"]').click()
    await page.getByTestId('status-filter-planned').click()
    await expect(page.getByTestId('backlog-row-902')).toBeVisible()
    await page.locator('[data-ui="tag-multi-select.remove.planned"]').click()
    await expect(page.getByTestId('backlog-row-902')).toHaveCount(0)
  })

  test('Drag Issue auf Sprint-Chip weist zu (Zeile verschwindet)', async ({ page }) => {
    const row = page.getByTestId('backlog-row-903')
    const chip = page.getByTestId('sprint-drop-101')
    await expect(row).toBeVisible()
    await expect(chip).toBeVisible()
    await dragOnto(page, row, chip)
    // Optimistic setItems weist assigned_sprint zu → Default-Filter (DD-144) blendet aus.
    await expect(page.getByTestId('backlog-row-903')).toHaveCount(0)
  })
})
