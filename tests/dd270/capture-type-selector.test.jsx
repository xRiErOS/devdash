import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CaptureView, { ISSUE_TYPES, DEFAULT_ISSUE_TYPE } from '../../src/views/CaptureView.jsx'

// DD-270 — Type-Selector im Issue-Catcher.
// Reine Logik-/SSR-Smoke-Tests (kein @testing-library im Repo — DD-267 nutzt
// dasselbe Muster). Interaktion via Playwright e2e/dd270/.

describe('DD-270 — ISSUE_TYPES Whitelist', () => {
  test('enthält genau 4 Typen in fixer Reihenfolge', () => {
    expect(ISSUE_TYPES.map(t => t.value)).toEqual(['bug', 'feature', 'improvement', 'core'])
  })

  test('Default-Type ist "feature" und ist im Whitelist enthalten', () => {
    expect(DEFAULT_ISSUE_TYPE).toBe('feature')
    expect(ISSUE_TYPES.find(t => t.value === DEFAULT_ISSUE_TYPE)).toBeDefined()
  })

  test('jeder Typ hat label + Catppuccin-Hex-Color + desc (DD-269 R2)', () => {
    for (const t of ISSUE_TYPES) {
      expect(t.label).toBeTruthy()
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(typeof t.desc).toBe('string')
      expect(t.desc.length).toBeGreaterThan(5)
    }
  })

  test('Catppuccin-Farben passen zur Spec (Bug=red, Feature=blue, Improvement=green, Core=mauve)', () => {
    const byVal = Object.fromEntries(ISSUE_TYPES.map(t => [t.value, t.color]))
    expect(byVal.bug).toBe('#f38ba8')
    expect(byVal.feature).toBe('#89b4fa')
    expect(byVal.improvement).toBe('#a6e3a1')
    expect(byVal.core).toBe('#cba6f7')
  })

  test('Object.freeze schützt vor versehentlicher Mutation', () => {
    expect(Object.isFrozen(ISSUE_TYPES)).toBe(true)
  })
})

describe('DD-270 — CaptureView SSR-Smoke', () => {
  test('rendert Type-Selector mit 4 Pills + Default "Feature" aria-checked', () => {
    const html = renderToStaticMarkup(<CaptureView />)
    expect(html).toContain('data-testid="capture-type-selector"')
    expect(html).toContain('data-testid="capture-type-bug"')
    expect(html).toContain('data-testid="capture-type-feature"')
    expect(html).toContain('data-testid="capture-type-improvement"')
    expect(html).toContain('data-testid="capture-type-core"')

    // Genau ein Pill ist aria-checked=true, nämlich Feature.
    const ariaTrue = (html.match(/aria-checked="true"/g) || []).length
    expect(ariaTrue).toBe(1)
    const featureBtn = html.match(/<button[^>]*data-testid="capture-type-feature"[^>]*>/)?.[0]
    const bugBtn = html.match(/<button[^>]*data-testid="capture-type-bug"[^>]*>/)?.[0]
    expect(featureBtn).toContain('aria-checked="true"')
    expect(bugBtn).toContain('aria-checked="false"')
  })

  test('rendert Type-Erklärungs-Subline (DD-269 R2) mit Default-Desc', () => {
    const html = renderToStaticMarkup(<CaptureView />)
    expect(html).toContain('data-testid="capture-type-desc"')
    const featureDesc = ISSUE_TYPES.find(t => t.value === 'feature').desc
    expect(html).toContain(featureDesc)
  })
})
