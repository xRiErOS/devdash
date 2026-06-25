// DD-635 (F3) — DetailStatusStepper: kanonischer Status-Fokus ganz oben.
// PO 2026-06-13: nicht volle 7-Schritt-Anzeige, sondern aktueller Status mittig
// primary + valide Transitions (getValidIssueTransitions) gedimmt davor/dahinter,
// horizontal scrollbar (overflow-x-auto) ohne Overflow-Bruch.
// env=node → SSR via renderToStaticMarkup (project_memory 333), keine Events.
import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DetailStatusStepper from '../../src/components/ui/organisms/DetailStatusStepper.jsx'
import { getValidIssueTransitions, ISSUE_STATUS_LABELS } from '../../src/lib/issueLifecycleTransitions.js'

const html = (current) => renderToStaticMarkup(<DetailStatusStepper current={current} />)

describe('DD-635 DetailStatusStepper', () => {
  test('rendert den Stepper-Anker ganz oben, horizontal scrollbar (kein Overflow-Bruch)', () => {
    const out = html('in_progress')
    expect(out).toContain('data-ui="app-shell.detail.status-stepper"')
    expect(out).toContain('overflow-x-auto')
  })

  test('aktueller Status mittig in Primärfarbe (status.current)', () => {
    const out = html('in_progress')
    expect(out).toContain('data-ui="app-shell.detail.status.current"')
    expect(out).toContain(ISSUE_STATUS_LABELS.in_progress)
    expect(out).toContain('var(--accent-primary)')
  })

  test('valide Transitions als gedimmte Optionen davor/dahinter (getValidIssueTransitions)', () => {
    const out = html('in_progress')
    // in_progress → to_review, planned, cancelled (cancelled liegt off-axis = nach)
    for (const s of getValidIssueTransitions('in_progress')) {
      expect(out).toContain(`data-ui="app-shell.detail.status.option.${s}"`)
    }
    // planned ist VOR in_progress, to_review NACH → planned-Option steht im HTML
    // vor der current-Pille, to_review danach.
    const idxPlanned = out.indexOf('status.option.planned')
    const idxCurrent = out.indexOf('status.current')
    const idxReview = out.indexOf('status.option.to_review')
    expect(idxPlanned).toBeGreaterThan(-1)
    expect(idxPlanned).toBeLessThan(idxCurrent)
    expect(idxCurrent).toBeLessThan(idxReview)
  })

  test('Status ohne Vorwärts-Transitions (passed) rendert trotzdem die current-Pille', () => {
    const out = html('passed')
    expect(out).toContain('data-ui="app-shell.detail.status.current"')
    expect(out).toContain(ISSUE_STATUS_LABELS.passed)
  })
})
