// tests/gf2-appshell/routes.test.jsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes } from 'react-router-dom'
import { buildRoutes } from '../../src/screens/_shell/routes.jsx'

function renderAt(path) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}><Routes>{buildRoutes()}</Routes></MemoryRouter>,
  )
}

describe('routes skeleton', () => {
  it('rendert backlog im App-Shell-Rahmen unter /:slug/backlog', () => {
    const html = renderAt('/devd/backlog')
    expect(html).toContain('data-ui="app-shell.root"')
  })
  it('rendert auch tool-level /projects IM Shell (PO: jede Route in der Shell)', () => {
    const html = renderAt('/projects')
    expect(html).toContain('data-ui="app-shell.root"')
    expect(html).toContain('data-ui="app-shell.rail"')
  })
  it('rendert /settings IM Shell', () => {
    expect(renderAt('/settings')).toContain('data-ui="app-shell.root"')
  })
  it('leitet / ohne Crash (Navigate)', () => {
    expect(() => renderAt('/')).not.toThrow()
  })
  it('gedroppte Route /devd/board rendert NICHT board', () => {
    const html = renderAt('/devd/board')
    expect(html).not.toContain('data-ui="screen:roadmap-board.root"')
  })
  it('wrappt /:slug in ProjectScope (Projekt-Auflösung vor Kind-Render, X-Project-Id aus URL)', () => {
    // ProjectScope löst den Slug auf, BEVOR Kind-Routen rendern; SSR ohne Effekt
    // → Fallback "Lade Projekt…". Ohne den Wrapper rendert backlog direkt (Bug:
    // activeProjectId bleibt Default 1 → falsches Projekt zeigt MBT statt DD).
    const html = renderAt('/devd/backlog')
    expect(html).toContain('Lade Projekt')
  })
})
