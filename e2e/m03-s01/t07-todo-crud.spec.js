import { test, expect } from '@playwright/test'

// DD-284 (M3-S02 T07) — ToDo-CRUD: Quick-Add, Done-Toggle, Reorder (Keyboard-DnD),
// Delete (Confirm-Dialog), Persistenz über Reload. Läuft ZULETZT (alphabetisch) —
// mutiert die geteilte E2E-DB; Assertions sind label-relativ (keine Absolut-Counts).
// Mockup-Fidelity-Checks: mantle-Item-bg, teal-Checkbox, devd:todo:N-Pille.
//
// DD-487 (T02): Der eigenständige Todo-Tab ist entfernt — die ToDos-CRUD-Fläche
// lebt jetzt als ToDos-Card im Overview-Tab (DD-486). Container-Anker:
//   project-home.todos        (Card)
//   project-home.todos.input  (Quick-Add-Input; Enter legt inline an, onCreate=create)
//   project-home.todos.filter (SegmentedControl Aktuell/Alle)
// Die ITEM-Anker (Wurzel plugin.todo.item, Kinder sortable-todo-item.checkbox/
// .delete/.drag-handle/.label) werden von ProjectTodoList/SortableTodoItem
// geteilt. DD-586/DD-487-Cutover: OverviewTab rendert die kanonische
// ui/organisms-ProjectTodoList OHNE dataUiScope-Override → SortableTodoItem
// nutzt seinen Default-Scope `sortable-todo-item` (der frühere Todo-Tab gab
// `project-home.todo-tab.list.item` mit; dieser Override entfiel im Cutover).

const TODO = '[data-ui="plugin.todo.item"]'
const QUICK_ADD = '[data-ui="project-home.todos.input"]'
// SegmentedControl forwardet kein eigenes data-ui (Root ist fix "segmented-control");
// die Filter-SC lebt in der ToDos-Spalte → auf project-home.todos scopen, Option "Alle"
// (opt.value=true → data-ui segmented-control.option.true) wählen.
const VIEW_ALL = '[data-ui="project-home.todos"] [data-ui="segmented-control.option.true"]'

// Quick-Add über die Overview-ToDos-Card: Input füllen + Enter (Form-Submit →
// ChecklistInputForm.handleSubmit → onCreate). Der „+"-Button öffnet das Detail-
// Modal (onOpenFull) und legt NICHT inline an — daher Enter statt Button-Klick.
async function quickAdd(page, label) {
  const input = page.locator(QUICK_ADD)
  await input.fill(label)
  await input.press('Enter')
}

async function gotoTodos(page) {
  await page.goto('/devd/home')
  // Overview ist Default-Tab; die ToDos-Card lebt im Overview-Panel.
  await expect(page.locator('[data-ui="project-home.tabs.overview"][role="tabpanel"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('[data-ui="project-home.todos"]')).toBeVisible({ timeout: 10000 })
  // DD-408: Hydration abwarten — die Liste lädt asynchron (useProjectTodos). Solange
  // `loading` läuft, ist der Quick-Add-Input `disabled` und die Liste noch leer.
  await expect(page.locator(TODO).first()).toBeVisible({ timeout: 10000 })
}

// DD-408: Default-Ansicht ist "Aktuell" (offene + HEUTE erledigte; DD-363 todoFilter).
// Done-Toggle- und Reorder-Tests brauchen die vollständige, positions-sortierte
// Ansicht ("Alle") — nur dort bleiben erledigte Items sichtbar.
async function showAllView(page) {
  await page.locator(VIEW_ALL).click()
}

test.describe('T07 — ToDo-CRUD (Overview-Card, DD-487)', () => {
  test('Case 4: Quick-Add legt neues ToDo an + Item-Optik (mantle-bg)', async ({ page }) => {
    await gotoTodos(page)
    const label = `E2E Neues ToDo ${Date.now()}`
    await quickAdd(page, label)

    const item = page.locator(TODO, { hasText: label })
    await expect(item).toBeVisible({ timeout: 10000 })

    // Mockup-Fidelity: Item-Hintergrund = mantle (nicht base/transparent).
    const bg = await item.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('Case 5: Done-Toggle markiert ToDo erledigt (teal-Checkbox + line-through)', async ({ page }) => {
    await gotoTodos(page)
    // "Alle": hält das Item nach dem Done-Toggle sichtbar (Default-Ansicht würde nur
    // HEUTE-erledigte zeigen — abhängig von completed_at-Serverzeit/TZ).
    await showAllView(page)
    const item = page.locator(TODO, { hasText: 'Mockup-Fidelity prüfen' })
    await expect(item).toBeVisible({ timeout: 10000 })
    const checkbox = item.locator('[data-ui="sortable-todo-item.checkbox"]')

    await checkbox.click()
    await expect(checkbox).toHaveAttribute('aria-checked', 'true')
    await expect(checkbox).toHaveText('✓')

    // Mockup-Fidelity: Label durchgestrichen.
    const label = item.locator('[data-ui="sortable-todo-item.label"]')
    const deco = await label.evaluate((el) => getComputedStyle(el).textDecorationLine)
    expect(deco).toContain('line-through')
  })

  // DD-487 (T02) — View-Parity-Befund: Der frühere Todo-Tab erlaubte Drag-Reorder
  // (reorderable = showAll && search-leer). Die Overview-ToDos-Card (DD-486) rendert
  // ProjectTodoList HARTKODIERT mit reorderable={false} → der Drag-Handle wird zwar
  // gerendert, ein Drag löst aber KEIN Reorder aus. Reorder ist also in der SOLL-Card
  // NICHT funktional (bewusste DD-486-Entscheidung; als Concern gemeldet). Diese Case
  // sichert den IST-Zustand: ein Drag-Versuch lässt die Reihenfolge UNVERÄNDERT.
  test('Case 6: Overview-ToDos-Card reordert NICHT per Drag (reorderable=false, DD-486)', async ({ page }) => {
    await gotoTodos(page)
    await showAllView(page)
    await expect.poll(async () => page.locator(TODO).count(), { timeout: 10000 }).toBeGreaterThanOrEqual(2)
    const LABEL = `${TODO} [data-ui="sortable-todo-item.label"]`
    const labelsBefore = await page.locator(LABEL).allInnerTexts()

    const handle = page.locator('[data-ui="sortable-todo-item.drag-handle"]').first()
    const second = page.locator(TODO).nth(1)
    const hb = await handle.boundingBox()
    const sb = await second.boundingBox()
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 12, { steps: 4 })
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height + 12, { steps: 10 })
    await page.mouse.up()

    // Reihenfolge bleibt stabil (Reorder im Overview-Card deaktiviert).
    await page.waitForTimeout(500)
    const labelsAfter = await page.locator(LABEL).allInnerTexts()
    expect(labelsAfter[0]).toBe(labelsBefore[0])
  })

  test('Case 7: Delete entfernt ToDo nach Confirm-Dialog', async ({ page }) => {
    await gotoTodos(page)
    const label = `E2E Delete ${Date.now()}`
    await quickAdd(page, label)

    const item = page.locator(TODO, { hasText: label })
    await expect(item).toBeVisible({ timeout: 10000 })

    await item.locator('[data-ui="sortable-todo-item.delete"]').click()
    await expect(page.locator('[data-ui="confirm-dialog"]')).toBeVisible()
    await page.locator('[data-ui="confirm-dialog.confirm"]').click()

    await expect(item).toHaveCount(0, { timeout: 10000 })
  })

  test('Case 8: Quick-Add persistiert über Reload (DB)', async ({ page }) => {
    await gotoTodos(page)
    const label = `E2E Persist ${Date.now()}`
    await quickAdd(page, label)
    await expect(page.locator(TODO, { hasText: label })).toBeVisible({ timeout: 10000 })

    await page.reload()
    await expect(page.locator('[data-ui="project-home.todos"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator(TODO, { hasText: label })).toBeVisible({ timeout: 10000 })
  })
})
