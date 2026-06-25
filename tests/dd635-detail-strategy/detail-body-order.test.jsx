// DD-635 (F3) — DetailBody: EINE Quelle der kanonischen Reihenfolge
// (Status-Stepper → Titel → Chips → Inhalt → Meta-LAST), geteilt von Vollbild
// (<1024) und Two-Pane (≥1024). FSD T02 / DD-595/596/608/609/610.
import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DetailBody from '../../apps/frontend/src/components/ui/organisms/DetailBody.jsx'

const render = () =>
  renderToStaticMarkup(
    <DetailBody
      statusStepper={<div data-ui="probe.stepper">STEPPER</div>}
      title={<h1 data-ui="probe.title">TITLE</h1>}
      chips={<span data-ui="probe.chip">CHIP</span>}
      meta={<div data-ui="probe.metainner">METAINNER</div>}
    >
      <div data-ui="probe.content">CONTENT</div>
    </DetailBody>,
  )

describe('DD-635 DetailBody kanonische Reihenfolge', () => {
  test('Reihenfolge: Stepper < Titel < Chips < Inhalt < Meta (Meta LAST)', () => {
    const out = render()
    const iStepper = out.indexOf('STEPPER')
    const iTitle = out.indexOf('TITLE')
    const iChip = out.indexOf('CHIP')
    const iContent = out.indexOf('CONTENT')
    const iMeta = out.indexOf('METAINNER')
    expect(iStepper).toBeGreaterThan(-1)
    expect(iStepper).toBeLessThan(iTitle)
    expect(iTitle).toBeLessThan(iChip)
    expect(iChip).toBeLessThan(iContent)
    expect(iContent).toBeLessThan(iMeta)
    // Meta ist das LETZTE Slot-Element.
    expect(iMeta).toBe(Math.max(iStepper, iTitle, iChip, iContent, iMeta))
  })

  test('emittiert die Chips- und Meta-Anker (kanonische Wrapper)', () => {
    const out = render()
    expect(out).toContain('data-ui="app-shell.detail.chips"')
    expect(out).toContain('data-ui="app-shell.detail.meta"')
  })

  test('Chips-Anker steht vor Meta-Anker', () => {
    const out = render()
    expect(out.indexOf('app-shell.detail.chips')).toBeLessThan(out.indexOf('app-shell.detail.meta'))
  })
})
