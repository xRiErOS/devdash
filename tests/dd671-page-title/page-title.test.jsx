import { describe, test, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PageTitle from '../../apps/frontend/src/components/ui/atoms/PageTitle.jsx'

// DD-671 — PageTitle Atom (shared ScreenTitle across views).
// env=node: der Komponenten-Vertrag wird via renderToStaticMarkup (SSR-String)
// geprüft — Repo-Konvention (vgl. dd599-slot-nav), da das Vitest-Environment
// `node` ist und kein jsdom installiert ist. Das DOM-Verhalten der eingebetteten
// Views wird über den Source-Guard (page-title-source-guard.test.js) abgesichert.

describe('DD-671 · PageTitle', () => {
  test('rendert ein <h1> mit dem Kindtext', () => {
    const out = renderToStaticMarkup(<PageTitle>Backlog</PageTitle>)
    expect(out).toMatch(/^<h1[ >]/)
    expect(out).toContain('Backlog')
  })

  test('reicht data-ui durch', () => {
    const out = renderToStaticMarkup(<PageTitle data-ui="project-home.title">slug</PageTitle>)
    expect(out).toContain('data-ui="project-home.title"')
  })

  test('reicht dataTestid als data-testid durch', () => {
    const out = renderToStaticMarkup(<PageTitle dataTestid="page-title">Backlog</PageTitle>)
    expect(out).toContain('data-testid="page-title"')
  })

  test('trägt die kanonischen Token-Klassen (font-display, text-2xl, m-0, --text)', () => {
    const out = renderToStaticMarkup(<PageTitle>X</PageTitle>)
    expect(out).toContain('font-display')
    expect(out).toContain('text-2xl')
    expect(out).toContain('m-0')
    expect(out).toContain('text-[var(--text)]')
  })

  test('rendert leadingIcon, wenn übergeben', () => {
    const out = renderToStaticMarkup(
      <PageTitle leadingIcon={<svg data-testid="lead-icon" />}>Backlog</PageTitle>,
    )
    expect(out).toContain('data-testid="lead-icon"')
    expect(out).toContain('Backlog')
  })

  test('rendert suffix muted, wenn übergeben', () => {
    const out = renderToStaticMarkup(<PageTitle suffix=" · devd">DevDash - Roadmap</PageTitle>)
    expect(out).toContain('DevDash - Roadmap')
    expect(out).toContain('· devd')
    // Suffix ist gemuted (subtext0) + normalgewichtig
    expect(out).toContain('text-[var(--subtext0)]')
    expect(out).toContain('font-normal')
  })

  test('as-Prop erlaubt anderes Heading-Element', () => {
    const out = renderToStaticMarkup(<PageTitle as="h2">X</PageTitle>)
    expect(out).toMatch(/^<h2[ >]/)
  })

  test('extra className wird angehängt', () => {
    const out = renderToStaticMarkup(<PageTitle className="pb-4">X</PageTitle>)
    expect(out).toContain('pb-4')
  })
})
