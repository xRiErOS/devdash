import { test, expect } from '@playwright/test'

// DD-277 — Milestone-Close-Dialog End-to-End.
//
// Seeding laeuft komplett ueber die api.js — Direct-DB-Inserts via
// better-sqlite3 zeigten unter Playwright WAL-Visibility-Probleme, bei denen
// die api.js-Connection externe Writes nicht mehr sah. API-Seeding teilt sich
// die Connection mit der zu testenden Operation und ist deshalb deterministisch.

// API-Seeder: erzeugt Milestone+Sprint+Issue ueber die api.js. Vermeidet ein
// in der E2E-Suite beobachtetes WAL-Visibility-Problem zwischen externen
// better-sqlite3-Writern und dem laufenden api.js-Reader.
async function apiSeedScenario(request, prefix, { issueCount = 1 } = {}) {
  const stamp = Date.now()
  const msRes = await request.post('/api/milestones', {
    headers: { 'X-Project-Id': '2', 'Content-Type': 'application/json' },
    // DD-466 (455e): status=active, damit MilestoneDetail den "Abschließen"-
    // Button (milestone-detail-status-complete) rendert — er ist an
    // milestone.status === 'active' gebunden (forward-only). Endpoint-Tests
    // (open-issues / close-with-issues) sind vom Initial-Status unabhängig.
    data: { name: `${prefix}-${stamp}`, target_date: '2026-12-31', status: 'active' },
  })
  if (!msRes.ok()) throw new Error(`POST milestones failed: ${msRes.status()} ${await msRes.text()}`)
  const ms = await msRes.json()

  const spRes = await request.post('/api/sprints', {
    headers: { 'X-Project-Id': '2', 'Content-Type': 'application/json' },
    data: { name: `${prefix}-sprint-${stamp}`, milestone_id: ms.id },
  })
  if (!spRes.ok()) throw new Error(`POST sprints failed: ${spRes.status()} ${await spRes.text()}`)
  const sprint = await spRes.json()

  const issues = []
  for (let i = 0; i < issueCount; i++) {
    const iRes = await request.post('/api/backlog', {
      headers: { 'X-Project-Id': '2', 'Content-Type': 'application/json' },
      data: {
        title: `${prefix} issue ${i + 1}`,
        type: 'feature',
        priority: 3,
        status: 'refined',
        goal: 'spec seed',
        background: `DD-277 ${prefix}`,
        sprint_id: sprint.id,
      },
    })
    if (!iRes.ok()) throw new Error(`POST backlog failed: ${iRes.status()} ${await iRes.text()}`)
    issues.push(await iRes.json())
  }

  return { ms, sprint, issues, sprintName: `${prefix}-sprint-${stamp}` }
}

test.describe('DD-277 · Milestone-Close-Dialog', () => {
  test('GET /api/milestones/:id/open-issues liefert offene Issues mit Sprint-Bezug', async ({ request }) => {
    const { ms, sprintName, issues } = await apiSeedScenario(request, 'DD-277-open', { issueCount: 1 })
    const seeded = issues[0]

    const res = await request.get(`/api/milestones/${ms.id}/open-issues`, {
      headers: { 'X-Project-Id': '2' },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.milestone.id).toBe(ms.id)
    expect(Array.isArray(body.items)).toBe(true)
    const found = body.items.find(i => i.id === seeded.id)
    expect(found).toBeTruthy()
    expect(found.sprint_name).toBe(sprintName)
  })

  test('POST /api/milestones/:id/close-with-issues triagiert alle drei Targets', async ({ request }) => {
    const { ms, issues } = await apiSeedScenario(request, 'DD-277-close', { issueCount: 3 })
    const [a, b, c] = issues

    const res = await request.post(`/api/milestones/${ms.id}/close-with-issues`, {
      headers: { 'X-Project-Id': '2', 'Content-Type': 'application/json' },
      data: {
        target_status: 'completed',
        assignments: [
          { issue_id: a.id, target: 'backlog' },
          { issue_id: b.id, target: 'done' },
          { issue_id: c.id, target: 'cancelled' },
        ],
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.target_status).toBe('completed')
    expect(body.processed).toHaveLength(3)
    expect(body.failed).toHaveLength(0)

    // Status-Verifikation via API (open-issues sollte jetzt 0 zeigen).
    const verifyOpen = await request.get(`/api/milestones/${ms.id}/open-issues`, {
      headers: { 'X-Project-Id': '2' },
    })
    const verifyData = await verifyOpen.json()
    expect(verifyData.milestone.status).toBe('completed')
    expect(verifyData.items).toHaveLength(0)

    // Weiterer Close-Call → 409.
    const second = await request.post(`/api/milestones/${ms.id}/close-with-issues`, {
      headers: { 'X-Project-Id': '2', 'Content-Type': 'application/json' },
      data: { target_status: 'completed', assignments: [] },
    })
    expect(second.status()).toBe(409)
  })

  test('Dialog rendert offene Issues mit Radio-Group + Confirm-Button', async ({ page, request }) => {
    const { ms, issues } = await apiSeedScenario(request, 'DD-277-UI', { issueCount: 1 })
    const issueData = issues[0]

    // DD-466 (455e): MilestoneView (Karten-Liste mit Inline-Close-Button) wurde
    // in der DD#60-Konsolidierung entfernt. /milestones ist jetzt der Swimlane-
    // Modus; der Close-Dialog lebt seit DD-464 in MilestoneDetail (/milestones/:id)
    // und wird über den "Abschließen"-Status-Button ausgelöst, der bei offenen
    // Issues den Triage-Dialog statt eines blinden status-Sets öffnet.
    await page.goto(`/devd/milestones/${ms.id}`)
    await expect(page.locator('[data-testid="milestone-detail"]')).toBeVisible({ timeout: 15_000 })

    // "Abschließen" (forward-only, nur bei status=active sichtbar) klicken →
    // handleSetStatus('completed') sondiert open-issues und öffnet den Dialog.
    const completeBtn = page.locator('[data-testid="milestone-detail-status-complete"]')
    await expect(completeBtn).toBeVisible({ timeout: 15_000 })
    await completeBtn.click()

    // Dialog erscheint. DD-588: ui/-Organism nutzt data-ui statt data-testid.
    const dialog = page.locator('[data-ui="milestone-close-dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Radio-Group für seeded Issue: Triage-Option via präzisem per-value data-ui-Anker.
    // Q01-fix: Organism emittiert data-ui="..triage.option.<value>" pro Label →
    // Selektor ist jetzt value-spezifisch statt text-basiert.
    const cancelledOption = dialog.locator('[data-ui="milestone-close-dialog.triage.option.cancelled"]').first()
    await expect(cancelledOption).toBeVisible()
    await cancelledOption.click()

    const confirm = dialog.locator('[data-ui="milestone-close-dialog.confirm"]')
    await expect(confirm).toBeEnabled()
    // Mobile-Viewports: Confirm-Button kann ausserhalb sein — vorher scrollen
    // und force=true verwenden (das Toast/Snackbar kann ihn ueberdecken).
    await confirm.scrollIntoViewIfNeeded()
    await confirm.click({ force: true })

    // Dialog schliesst, Toast erscheint, Milestone-Status auf completed.
    await expect(dialog).toHaveCount(0, { timeout: 5_000 })

    // Verifikation via API (Direct-DB-Read sieht WAL-Writes des api.js-Prozesses
    // unter Playwright nicht zuverlaessig — siehe Test 2).
    const verifyMsRes = await request.get(`/api/milestones/${ms.id}/open-issues`, {
      headers: { 'X-Project-Id': '2' },
    })
    expect(verifyMsRes.ok()).toBe(true)
    const verifyData = await verifyMsRes.json()
    expect(verifyData.milestone.status).toBe('completed')
  })
})
