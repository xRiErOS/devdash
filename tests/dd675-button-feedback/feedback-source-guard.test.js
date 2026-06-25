// DD-675 — Source-Guard (env=node): belegt strukturell, dass die einheitliche
// Copy-Feedback-Verdrahtung (useCopyFeedback-Hook + toast()-Single-Source) an
// allen in-scope Call-Sites tatsächlich greift. Mirror des dd594-Source-Guard-
// Patterns (Conditional-/Effekt-Verhalten ist headless ohne jsdom nicht
// mountbar — visuelle Abnahme = PO, DD-186).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const toastLib = read('apps/frontend/src/lib/toast.js')
const hook = read('apps/frontend/src/hooks/useCopyFeedback.js')
const sstdTab = read('apps/frontend/src/components/ui/organisms/SstdTab.jsx')
const todoCli = read('apps/frontend/src/components/ui/molecules/TodoCliHelp.jsx')
const settingsSidebar = read('apps/frontend/src/components/ui/organisms/SettingsSidebar.jsx')
const projectMetaCard = read('apps/frontend/src/components/ui/organisms/ProjectMetaCard.jsx')

describe('DD-675 — toast()-Single-Source', () => {
  test('apps/frontend/src/lib/toast.js exportiert toast() und dispatcht devd-toast', () => {
    expect(toastLib).toMatch(/export\s+function\s+toast/)
    expect(toastLib).toContain("'devd-toast'")
    expect(toastLib).toContain('CustomEvent')
  })

  test('SSR-Guard auf window', () => {
    expect(toastLib).toContain("typeof window === 'undefined'")
  })
})

describe('DD-675 — useCopyFeedback-Hook', () => {
  test('exportiert default-Hook + pur-testbaren performCopy', () => {
    expect(hook).toMatch(/export\s+default\s+function\s+useCopyFeedback/)
    expect(hook).toMatch(/export\s+(async\s+)?function\s+performCopy/)
  })

  test('liefert { copied, copy }, nutzt toast() aus der Single-Source', () => {
    expect(hook).toContain('copied')
    expect(hook).toMatch(/from\s+['"]\.\.\/lib\/toast(\.js)?['"]/)
    expect(hook).toContain('navigator.clipboard')
  })

  test('Timer-Cleanup bei Unmount (useEffect-Return) + Re-Copy', () => {
    // clearTimeout muss sowohl im Effekt-Cleanup als auch vor dem Neusetzen laufen.
    expect(hook).toContain('clearTimeout')
    expect(hook).toMatch(/useEffect\([\s\S]*clearTimeout/)
  })
})

describe('DD-675 — Call-Sites verdrahtet', () => {
  test('SstdTab nutzt die toast()-Single-Source (kein lokaler toast-Helper mehr)', () => {
    expect(sstdTab).toMatch(/from\s+['"][^'"]*lib\/toast(\.js)?['"]/)
    // Der frühere lokale `function toast(` Helper ist entfernt.
    expect(sstdTab).not.toMatch(/function\s+toast\s*\(/)
  })

  test('SstdTab copy-full nutzt den Hook (transienter Check)', () => {
    expect(sstdTab).toContain('useCopyFeedback')
    expect(sstdTab).toContain('project-home.tabs.sstd.copy-full')
  })

  test('TodoCliHelp nutzt den Hook statt lokaler copied-State-Logik', () => {
    expect(todoCli).toContain('useCopyFeedback')
    expect(todoCli).toContain('.row.copy')
  })

  test('SettingsSidebar meta-copy nutzt den Hook', () => {
    expect(settingsSidebar).toContain('useCopyFeedback')
    expect(settingsSidebar).toContain('.meta.copy')
  })

  test('ProjectMetaCard nutzt den Hook', () => {
    expect(projectMetaCard).toContain('useCopyFeedback')
    // data-ui = `${dataUiScope}.copy`, Default-Scope 'project-meta-card'.
    expect(projectMetaCard).toContain("dataUiScope = 'project-meta-card'")
    expect(projectMetaCard).toContain('`${dataUiScope}.copy`')
  })
})
