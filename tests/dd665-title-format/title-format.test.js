import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { formatProjectHomeTitle } from '../../src/lib/projectTitle.js'

const ROOT = resolve(import.meta.dirname, '../..')
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8')

describe('DD-665 — formatProjectHomeTitle (PREFIX - NAME (SLUG))', () => {
  test('full format with all three parts', () => {
    expect(formatProjectHomeTitle({ prefix: 'DD', name: 'Developer Dashboard', slug: 'devd' }))
      .toBe('DD - Developer Dashboard (devd)')
  })

  test('strict ordering: prefix, then name, then slug in parens', () => {
    const out = formatProjectHomeTitle({ prefix: 'MBT', name: 'MyBaby Tracker', slug: 'mybaby' })
    expect(out).toBe('MBT - MyBaby Tracker (mybaby)')
  })

  test('missing prefix → drops the "PREFIX - " part', () => {
    expect(formatProjectHomeTitle({ name: 'Foo', slug: 'foo' })).toBe('Foo (foo)')
  })

  test('missing slug → drops the "(slug)" part', () => {
    expect(formatProjectHomeTitle({ prefix: 'DD', name: 'Foo' })).toBe('DD - Foo')
  })

  test('only name → bare name', () => {
    expect(formatProjectHomeTitle({ name: 'Foo' })).toBe('Foo')
  })

  test('empty → sane placeholder', () => {
    expect(formatProjectHomeTitle({})).toBe('Project')
    expect(formatProjectHomeTitle()).toBe('Project')
  })

  test('name falls back to slug when name absent', () => {
    expect(formatProjectHomeTitle({ prefix: 'DD', slug: 'devd' })).toBe('DD - devd (devd)')
  })
})

describe('DD-665 — ProjectHomeView wiring (source-grep)', () => {
  const VIEW = 'src/views/ProjectHomeView.jsx'

  test('imports formatProjectHomeTitle', () => {
    expect(src(VIEW)).toMatch(/import \{ formatProjectHomeTitle \} from/)
  })

  test('publiziert den formatierten homeTitle in den Sub-Header (nicht den bare slug)', () => {
    // DD#82-r2: ProjectHomeView rendert den Titel nicht mehr selbst, sondern
    // publiziert homeTitle via usePageTitle(); der app-shell.sub-header rendert ihn.
    const s = src(VIEW)
    expect(s).toMatch(/usePageTitle\(homeTitle\)/)
    expect(s).not.toMatch(/usePageTitle\(projectSlug\)/)
  })

  test('browser-tab title mirrors the format (homeTitle passed to useDocumentTitle)', () => {
    expect(src(VIEW)).toMatch(/useDocumentTitle\(homeTitle/)
  })
})
