// tests/gf2-appshell/frame.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

// AuthExpiredOverlay rendert null solange keine Session abgelaufen ist.
// Für den Mount-Test erzwingen wir required=true, damit der Anker im Markup erscheint.
vi.mock('../../apps/frontend/src/hooks/useAuthRequired.js', () => ({ default: () => true }))

import { AppShellFrame } from '../../apps/frontend/src/screens/_shell/AppShellFrame.jsx'

describe('AppShellFrame', () => {
  it('emittiert die stabilen App-Shell-Anker', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/devd/home']}>
        <AppShellFrame />
      </MemoryRouter>,
    )
    expect(html).toContain('data-ui="app-shell.root"')
    expect(html).toContain('data-ui="app-shell.rail"')
    expect(html).toContain('data-ui="app-shell.topbar"')
    expect(html).toContain('data-ui="app-shell.content"')
  })
  it('mountet Auth-Overlay (sichtbar wenn Session abgelaufen)', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/devd/home']}><AppShellFrame /></MemoryRouter>,
    )
    expect(html).toContain('data-ui="auth.expired-overlay"')
  })
})
