// DD-633 (F1, Slice B) — Layout-Integration des FabRadial-Hubs.
// Vertrag: Layout mountet FabRadial (<lg), hält fabOpen-State und verdrahtet
// die 3 Aktionen auf bestehende Shell-Handler — new-issue → IssueCreateModal,
// review → Review-Sprint-Navigation, switcher → Quick-Switcher.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const src = () => readFileSync(join(ROOT, 'apps/frontend/src/components/ui/layout/Layout.jsx'), 'utf8')

describe('DD-633 Layout — FabRadial verdrahtet', () => {
  test('importiert + rendert FabRadial', () => {
    const s = src()
    expect(s).toMatch(/import\s+FabRadial\s+from\s+['"][^'"]*organisms\/FabRadial\.jsx['"]/)
    expect(s).toMatch(/<FabRadial/)
  })

  test('hält fabOpen-State (useState)', () => {
    expect(src()).toMatch(/\[fabOpen,\s*setFabOpen\]\s*=\s*useState/)
  })

  test('definiert die 3 FAB-Aktionen new-issue / review / switcher', () => {
    const s = src()
    for (const id of ['new-issue', 'review', 'switcher']) {
      expect(s).toContain(`id: '${id}'`)
    }
  })

  test('verdrahtet die Aktionen auf bestehende Shell-Handler', () => {
    const s = src()
    // new-issue öffnet das IssueCreateModal, switcher den Quick-Switcher
    expect(s).toMatch(/case 'new-issue':[\s\S]*setIssueModalOpen\(true\)/)
    expect(s).toMatch(/case 'switcher':[\s\S]*setSwitcherOpen\(true\)/)
    // review navigiert (eigener Handler oder Inline-Navigation)
    expect(s).toMatch(/case 'review':/)
  })
})
