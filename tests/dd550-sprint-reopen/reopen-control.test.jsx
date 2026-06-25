// DD-550 — Sprint-Reopen-Control für cancelled Sprints.
//
// Bug: Ein cancelled Sprint fiel in den Terminal-Early-Return von SprintActions und
// rendert keine Lifecycle-Aktion → der backend-sanktionierte Reopen-Pfad
// cancelled → planning (DD-524) hatte KEINE UI. Fix: cancelled fällt durch und rendert
// einen Reopen-Button, verdrahtet auf onTransition('planning').
//
// Geprüft wird beides: das SSR-gerenderte Markup (Reopen-Anker rendert bei cancelled,
// NICHT bei completed/closed) und die Callback-Verdrahtung onTransition?.('planning')
// auf Source-Ebene (renderToStaticMarkup kann kein onClick feuern).

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import SprintActions from '../../src/components/ui/organisms/SprintActions.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const src = readFileSync(
  join(ROOT, 'src/components/ui/organisms/SprintActions.jsx'),
  'utf8',
)

const noop = () => {}
const render = (status) =>
  renderToStaticMarkup(<SprintActions sprint={{ id: 1, status }} onTransition={noop} />)

describe('DD-550 · Reopen-Button rendert für cancelled', () => {
  test('cancelled → Reopen-Anker (.toolbar.reopen) ist im Markup', () => {
    const html = render('cancelled')
    expect(html).toContain('sprint-actions.toolbar.reopen')
  })

  test('cancelled → Reopen-Button trägt das Reaktivieren-Label', () => {
    const html = render('cancelled')
    expect(html).toMatch(/Sprint reaktivieren/)
    expect(html).toContain('var(--accent-info)')
  })

  test('completed bleibt terminal (kein Reopen, leeres Render)', () => {
    expect(render('completed')).toBe('')
  })

  test('closed bleibt terminal (kein Reopen, leeres Render)', () => {
    expect(render('closed')).toBe('')
  })
})

describe('DD-550 · Reopen ist auf onTransition(planning) verdrahtet', () => {
  test('Terminal-Guard lässt nur completed/closed früh zurückkehren', () => {
    expect(src).toMatch(/status === 'completed' \|\| status === 'closed'\) return null/)
    // cancelled darf NICHT mehr Teil des Early-Returns sein.
    const guardLine = src.match(/if \(status === 'completed'.*return null/)?.[0] ?? ''
    expect(guardLine).not.toMatch(/cancelled/)
  })

  test("cancelled-Zweig ruft onTransition('planning')", () => {
    expect(src).toMatch(/status === 'cancelled'/)
    expect(src).toMatch(/onTransition\?\.\('planning'\)/)
  })

  test('Reopen-Button hat den .toolbar.reopen data-ui-Anker', () => {
    expect(src).toMatch(/toolbar\.reopen/)
  })
})
