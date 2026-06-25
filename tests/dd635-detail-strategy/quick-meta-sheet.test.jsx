// DD-635 (F3) — QuickMetaSheet: halbhohes Bottom-Sheet für Sprint/Priorität
// (DD-604). Grabber + ≥44px-Touch-Targets + Übernehmen/Abbrechen.
import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import QuickMetaSheet from '../../apps/frontend/src/components/ui/organisms/QuickMetaSheet.jsx'

const PRIORITIES = [1, 2, 3]
const render = (props = {}) =>
  renderToStaticMarkup(
    <QuickMetaSheet
      open
      sprintLabel="DD#81 · Mobile UX"
      priority={2}
      priorities={PRIORITIES}
      sprintOptions={[{ value: '', label: '— kein Sprint —' }, { value: 1, label: 'Sprint 1' }]}
      {...props}
    />,
  )

describe('DD-635 QuickMetaSheet', () => {
  test('geschlossen (open=false) rendert nichts', () => {
    expect(renderToStaticMarkup(<QuickMetaSheet open={false} />)).toBe('')
  })

  test('offen: Sheet- + Scrim-Anker', () => {
    const out = render()
    expect(out).toContain('data-ui="app-shell.detail.quick-meta.sheet"')
    expect(out).toContain('data-ui="app-shell.detail.quick-meta.scrim"')
  })

  test('Sprint + Priorität bedienbar, ≥44px-Targets', () => {
    const out = render()
    expect(out).toContain('Sprint')
    expect(out).toContain('Priorität')
    expect(out).toContain('DD#81 · Mobile UX')
    // mindestens eine 44px-Reihe (min-h-[44px]) für Touch-Tauglichkeit
    expect(out).toContain('min-h-[44px]')
  })

  test('Übernehmen + Abbrechen Aktionen', () => {
    const out = render()
    expect(out).toContain('Übernehmen')
    expect(out).toContain('Abbrechen')
  })
})
