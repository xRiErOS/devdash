import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')
const SSTD_TAB = 'apps/frontend/src/components/ui/organisms/SstdTab.jsx'

function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

describe('DD-494 (I02) — SSTD-Tab Copy-Full button (source-grep)', () => {
  test('imports the Copy icon from lucide-react', () => {
    expect(src(SSTD_TAB)).toMatch(/import \{[^}]*\bCopy\b[^}]*\} from 'lucide-react'/)
  })

  test('renders a Copy-Full button with the canonical data-ui anchor', () => {
    const s = src(SSTD_TAB)
    expect(s).toMatch(/data-ui="project-home\.tabs\.sstd\.copy-full"/)
  })

  test('the button is wired to copyFull and is keyboard-accessible (real <button type="button">)', () => {
    const s = src(SSTD_TAB)
    const i = s.indexOf('data-ui="project-home.tabs.sstd.copy-full"')
    // look around the anchor for the enclosing <button ... onClick={copyFull}>
    const region = s.slice(Math.max(0, i - 400), i + 200)
    expect(region).toMatch(/<button/)
    expect(region).toMatch(/type="button"/)
    expect(region).toMatch(/onClick=\{copyFull\}/)
  })

  test('prefetches the FULL reassembled SSTD via GET /api/projects/:id/sstd on mount', () => {
    const s = src(SSTD_TAB)
    // DD-493 R2: prefetch on mount (cached) so the click handler can write the
    // clipboard synchronously — avoids the Safari/Firefox lost-user-gesture
    // NotAllowedError that an await-fetch-then-writeText causes.
    expect(s).toMatch(/fetch\(`\/api\/projects\/\$\{projectId\}\/sstd`/)
  })

  test('the prefetch sends X-Project-Id and caches sstd_content into sstdContent', () => {
    const s = src(SSTD_TAB)
    const i = s.indexOf('/sstd`')
    const region = s.slice(i, i + 400)
    expect(region).toMatch(/'X-Project-Id': String\(projectId\)/)
    expect(region).toMatch(/setSstdContent\(data\?\.sstd_content/)
  })

  test('copyFull copies the cached FULL SSTD synchronously via the unified hook (DD-675)', () => {
    const s = src(SSTD_TAB)
    const region = s.slice(s.indexOf('const copyFull'), s.indexOf('const copyFull') + 600)
    // synchronous: the handler itself is not async and contains no await — the
    // unified useCopyFeedback hook initiates writeText in the same click tick.
    expect(region).not.toMatch(/const copyFull = async/)
    expect(region).not.toMatch(/await /)
    // copies the cached reassembled content verbatim through the hook
    expect(region).toMatch(/copyFullToClipboard\(payload/)
    expect(region).toMatch(/const payload = sstdContent/)
    // hook is sourced + bound in the component
    expect(s).toContain('useCopyFeedback')
    expect(s).toMatch(/copy:\s*copyFullToClipboard\s*\}\s*=\s*useCopyFeedback/)
  })

  test('copyFull surfaces failure via the unified toast and the prefetch logs on error (DD-675)', () => {
    const s = src(SSTD_TAB)
    // DD-675: clipboard-failure feedback ist in useCopyFeedback zentralisiert
    // (toast 'Kopieren fehlgeschlagen', 'error') — kein inline console.error mehr
    // im copyFull-Handler. Der "noch nicht geladen"-Guard toastet weiterhin.
    const region = s.slice(s.indexOf('const copyFull'), s.indexOf('const copyFull') + 600)
    expect(region).toMatch(/toast\('SSTD ist noch nicht geladen', 'error'\)/)
    expect(s).toMatch(/from '\.\.\/\.\.\/\.\.\/lib\/toast(\.js)?'/)
    // der Prefetch-Error-Log bleibt unverändert erhalten
    expect(s).toMatch(/console\.error\('\[DD-494\] SSTD prefetch failed'/)
  })

  test('button is disabled until the SSTD is loaded (guards an empty copy)', () => {
    const s = src(SSTD_TAB)
    const i = s.indexOf('data-ui="project-home.tabs.sstd.copy-full"')
    const region = s.slice(Math.max(0, i - 400), i + 200)
    expect(region).toMatch(/disabled=\{!sstdContent\}/)
  })
})
