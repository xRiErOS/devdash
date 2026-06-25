import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { renderToStaticMarkup } from 'react-dom/server'
import FilterPopover from '../../src/components/ui/molecules/FilterPopover.jsx'

const ROOT = resolve(import.meta.dirname, '../..')
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8')

describe('DD-672 — FilterPopover trigger carries the correct data-ui (bug fix)', () => {
  test('the filter-menu TRIGGER button is scoped, not the default "button"', () => {
    const html = renderToStaticMarkup(
      <FilterPopover dataUi="backlog.toolbar.filter-menu" label="Filter" activeCount={0} />,
    )
    // The trigger <button> must carry the scoped anchor …
    expect(html).toMatch(/data-ui="backlog\.toolbar\.filter-menu\.trigger"/)
    // … and must NOT fall back to the atom default on the trigger.
    expect(html).not.toMatch(/<button[^>]*data-ui="button"/)
  })

  test('the wrapper keeps its own anchor (unchanged)', () => {
    const html = renderToStaticMarkup(
      <FilterPopover dataUi="backlog.toolbar.filter-menu" label="Filter" activeCount={0} />,
    )
    expect(html).toMatch(/data-ui="backlog\.toolbar\.filter-menu"/)
  })

  test('FilterPopover source passes data-ui to the trigger Button', () => {
    expect(src('src/components/ui/molecules/FilterPopover.jsx'))
      .toMatch(/data-ui=\{`\$\{dataUi\}\.trigger`\}/)
  })
})

describe('DD-672 — Button atom forwards a passed data-ui (regression)', () => {
  test('the default "button" anchor is followed by {...rest} so callers can override', () => {
    const s = src('src/components/ui/atoms/Button.jsx')
    const i = s.indexOf('data-ui="button"')
    expect(i).toBeGreaterThan(-1)
    // {...rest} must come AFTER the hardcoded default → caller-supplied data-ui wins.
    expect(s.indexOf('{...rest}')).toBeGreaterThan(i)
  })
})

describe('DD-672 — toolbar trigger text style unified (SplitButton matches Button md)', () => {
  const SPLIT = src('src/components/ui/molecules/SplitButton.jsx')

  test('SplitButton trigger uses text-xs (matches Button md), not text-sm', () => {
    expect(SPLIT).not.toMatch(/text-sm/)
    expect(SPLIT).toMatch(/text-xs/)
  })

  test('SplitButton trigger uses gap-2 (matches Button base), not gap-1.5', () => {
    expect(SPLIT).not.toMatch(/gap-1\.5/)
    expect(SPLIT).toMatch(/gap-2/)
  })
})
