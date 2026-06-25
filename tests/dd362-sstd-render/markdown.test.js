// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../../apps/frontend/src/lib/markdown.js'

describe('DD-362 renderMarkdown — GFM-Erweiterungen für SSTD-Render', () => {
  it('rendert GFM-Tabellen statt rohem Pipe-Text', () => {
    const out = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(out).toContain('<table')
    expect(out).toContain('<th')
    expect(out).toContain('<td')
    expect(out).not.toContain('| a | b |')
    expect(out).not.toContain('<p>| a | b |</p>')
  })

  it('rendert Links mit target/rel und blockt unsichere Schemes', () => {
    const link = renderMarkdown('[Repo](https://x.y)')
    expect(link).toContain('<a href="https://x.y"')
    expect(link).toContain('target="_blank"')
    expect(link).toContain('rel="noopener noreferrer"')

    const evil = renderMarkdown('[x](javascript:alert(1))')
    expect(evil).not.toContain('<a')
    expect(evil).toContain('[x](javascript:alert(1))')
  })

  it('rendert Blockquotes', () => {
    const out = renderMarkdown('> hallo')
    expect(out).toContain('<blockquote')
    expect(out).toContain('hallo')
  })

  it('rendert Horizontal-Rules', () => {
    const out = renderMarkdown('text\n\n---\n\nmehr')
    expect(out).toContain('<hr')
  })

  it('rendert Headings h4/h5/h6', () => {
    expect(renderMarkdown('#### t')).toContain('<h4')
    expect(renderMarkdown('##### t')).toContain('<h5')
    expect(renderMarkdown('###### t')).toContain('<h6')
  })

  describe('Regression — bestehende Features bleiben funktionsfähig', () => {
    it('bold', () => {
      expect(renderMarkdown('**fett**')).toContain('<strong>fett</strong>')
    })
    it('italic', () => {
      expect(renderMarkdown('*kursiv*')).toContain('<em>kursiv</em>')
    })
    it('inline code', () => {
      expect(renderMarkdown('`code`')).toContain('<code')
    })
    it('code block', () => {
      expect(renderMarkdown('```\nconst x = 1\n```')).toContain('<pre')
    })
    it('h1', () => {
      expect(renderMarkdown('# H1')).toContain('<h1')
    })
    it('unordered list', () => {
      expect(renderMarkdown('- item')).toContain('<ul')
    })
    it('ordered list', () => {
      expect(renderMarkdown('1. item')).toContain('<ol')
    })
    it('task list', () => {
      const out = renderMarkdown('- [x] task')
      expect(out).toContain('<input type="checkbox"')
      expect(out).toContain('checked')
    })
  })

  it('rendert SSTD-artige Mischung ohne rohe Pipe-/Bracket-Artefakte', () => {
    const sstd = [
      '## Architektur',
      '',
      'Siehe [Repo](https://github.com/x/y) für Details.',
      '',
      '| # | ID | Status |',
      '| --- | :--: | ---: |',
      '| 1 | DD-7 | done |',
      '| 2 | DD-8 | open |',
      '',
      '> Hinweis: Master ist die DB.',
    ].join('\n')
    const out = renderMarkdown(sstd)
    expect(out).toContain('<h2')
    expect(out).toContain('<table')
    expect(out).toContain('<a href="https://github.com/x/y"')
    expect(out).toContain('<blockquote')
    // keine rohen Tabellen-/Link-Artefakte
    expect(out).not.toContain('| # | ID | Status |')
    expect(out).not.toContain('[Repo](https://github.com/x/y)')
    expect(out).not.toContain('&gt; Hinweis')
  })
})
