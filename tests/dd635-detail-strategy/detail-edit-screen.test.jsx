// DD-635 (F3) — DetailEditScreen: dedizierter Vollbild-Editor für lange Felder
// (DD-599). Eigener Back-Header (app-shell.detail.back) + Editorfeld
// (app-shell.detail.edit-screen.field) + Sticky-Action-Bar (Speichern/Abbrechen, ≥44px).
import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DetailEditScreen from '../../apps/frontend/src/components/ui/organisms/DetailEditScreen.jsx'

const render = (props = {}) =>
  renderToStaticMarkup(
    <DetailEditScreen open label="Background" value="langer Text" {...props} />,
  )

describe('DD-635 DetailEditScreen', () => {
  test('geschlossen rendert nichts', () => {
    expect(renderToStaticMarkup(<DetailEditScreen open={false} />)).toBe('')
  })

  test('Back-Header (app-shell.detail.back) + Editorfeld-Anker', () => {
    const out = render()
    expect(out).toContain('data-ui="app-shell.detail.back"')
    expect(out).toContain('data-ui="app-shell.detail.edit-screen.field"')
  })

  test('Sticky-Action-Bar mit Speichern + Abbrechen', () => {
    const out = render()
    expect(out).toContain('data-ui="sticky-action-bar"')
    expect(out).toContain('Speichern')
    expect(out).toContain('Abbrechen')
  })

  test('Label + Value werden gerendert', () => {
    const out = render()
    expect(out).toContain('Background')
    expect(out).toContain('langer Text')
  })
})
