// MarkdownField vereinfacht: Vendor-Editor (note-field/CodeMirror/ixora) raus,
// schlanke Komposition Textarea-Atom (Edit) + renderMarkdown-Anzeige (Vorschau)
// + Edit/Vorschau-Toggle. Prop-Vertrag stabil (value/onChange/rows/placeholder/
// disabled/className); Toggle-Props (mode/onModeChange/defaultMode/previewEmptyLabel)
// wiederbelebt. SSR-Vertrag über controlled `mode` (Click-Toggle node-env untestbar).

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MarkdownField from '../../apps/frontend/src/components/ui/molecules/MarkdownField.jsx'

const noop = () => {}
const render = (props = {}) =>
  renderToStaticMarkup(<MarkdownField onChange={noop} {...props} />)

describe('MarkdownField — Struktur & Anker', () => {
  test('Wurzel trägt data-ui="markdown-field"', () => {
    expect(render()).toContain('data-ui="markdown-field"')
  })

  test('rendert keinen Vendor-Editor mehr (kein CodeMirror/nf-root)', () => {
    const html = render({ value: '# Titel' })
    expect(html).not.toContain('cm-editor')
    expect(html).not.toContain('nf-root')
  })

  test('Toggle: Edit- und Vorschau-Button mit Molecule-Ankern', () => {
    const html = render()
    expect(html).toContain('data-ui="molecule.markdown-field.toggle.edit"')
    expect(html).toContain('data-ui="molecule.markdown-field.toggle.preview"')
  })
})

describe('MarkdownField — Edit-Modus (Default)', () => {
  test('Default rendert Textarea-Atom mit value', () => {
    const html = render({ value: 'Rohtext' })
    expect(html).toContain('data-ui="textarea"')
    expect(html).toContain('Rohtext')
  })

  test('rows wird an Textarea durchgereicht', () => {
    expect(render({ rows: 9 })).toContain('rows="9"')
  })

  test('disabled setzt das Textarea readOnly (disabled-Attribut)', () => {
    const html = render({ value: 'x', disabled: true })
    const idx = html.indexOf('data-ui="textarea"')
    const slice = html.slice(Math.max(0, idx - 200), idx + 200)
    expect(slice).toContain('disabled')
  })

  test('Edit-Toggle ist aktiv (aria-pressed=true), Vorschau inaktiv', () => {
    const html = render()
    const editIdx = html.indexOf('molecule.markdown-field.toggle.edit')
    const prevIdx = html.indexOf('molecule.markdown-field.toggle.preview')
    // Button rendert aria-pressed NACH dem data-ui-Anker; je Button-Slice prüfen.
    expect(html.slice(editIdx, prevIdx)).toContain('aria-pressed="true"')
    expect(html.slice(prevIdx)).toContain('aria-pressed="false"')
  })
})

describe('MarkdownField — Vorschau-Modus', () => {
  test('mode=preview rendert formatiertes HTML via renderMarkdown', () => {
    const html = render({ mode: 'preview', value: 'Das ist **fett**' })
    expect(html).toContain('<strong>fett</strong>')
    expect(html).not.toContain('data-ui="textarea"')
  })

  test('mode=preview rendert Heading/Checkliste formatiert', () => {
    const html = render({ mode: 'preview', value: '# Titel\n\n- [x] erledigt' })
    expect(html).toContain('<h1')
    expect(html).toContain('type="checkbox"')
  })

  test('leerer Wert zeigt previewEmptyLabel', () => {
    const html = render({ mode: 'preview', value: '', previewEmptyLabel: 'Nichts da.' })
    expect(html).toContain('Nichts da.')
  })

  test('Vorschau-Toggle ist aktiv (aria-pressed=true) bei mode=preview', () => {
    const html = render({ mode: 'preview' })
    const prevIdx = html.indexOf('molecule.markdown-field.toggle.preview')
    expect(html.slice(prevIdx)).toContain('aria-pressed="true"')
  })
})

describe('MarkdownField — onChange-Verdrahtung (Source)', () => {
  test('Textarea-onChange delegiert den String an onChange', () => {
    const src = readSource()
    expect(src).toMatch(/onChange\?\.\(/)
  })
  test('kein note-field-Import mehr', () => {
    expect(readSource()).not.toContain('note-field')
  })
})

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
function readSource() {
  return readFileSync(
    join(__dirname, '..', '..', 'apps/frontend/src/components/ui/molecules/MarkdownField.jsx'),
    'utf8'
  )
}
