// DD-633 (F1, Slice C) — Layout-Integration der NavRail + Breakpoint-Shift.
// Adaptive Shell: BottomTabBar <lg · NavRail lg..xl · IconSidebar (Desktop) ≥xl.

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

describe('DD-633 Layout — NavRail verdrahtet', () => {
  const src = () => read('src/components/ui/layout/Layout.jsx')

  test('importiert + rendert NavRail', () => {
    const s = src()
    expect(s).toMatch(/import\s+NavRail\s+from\s+['"][^'"]*organisms\/NavRail\.jsx['"]/)
    expect(s).toMatch(/<NavRail/)
  })

  test('NavRail teilt die Sidebar-Props (items/activeKey/onNavigate)', () => {
    const s = src()
    expect(s).toMatch(/<NavRail[\s\S]*items=\{sidebarItems\}/)
    expect(s).toMatch(/<NavRail[\s\S]*activeKey=\{sidebarActiveKey\}/)
    expect(s).toMatch(/<NavRail[\s\S]*onNavigate=\{handleSidebarNavigate\}/)
  })
})

describe('DD-633 IconSidebar — Desktop-Breakpoint auf xl gehoben', () => {
  test('Desktop-Aside ist erst ab xl sichtbar (Rail füllt lg..xl)', () => {
    const s = read('src/components/ui/organisms/IconSidebar.jsx')
    expect(s).toContain('hidden xl:flex')
    expect(s).not.toMatch(/hidden lg:flex/)
  })

  test('SidebarBody ist für die NavRail wiederverwendbar exportiert', () => {
    const s = read('src/components/ui/organisms/IconSidebar.jsx')
    expect(s).toMatch(/export\s+function\s+SidebarBody|export\s*\{[^}]*SidebarBody/)
  })
})
