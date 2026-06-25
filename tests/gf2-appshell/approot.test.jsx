// tests/gf2-appshell/approot.test.jsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppShellView } from '../../apps/frontend/src/screens/_shell/AppRoot.jsx'

describe('AppRoot view dispatch', () => {
  it('app-shell-View rendert den Shell (root-Anker)', () => {
    const html = renderToStaticMarkup(<AppShellView initialPath="/devd/backlog" />)
    expect(html).toContain('data-ui="app-shell.root"')
  })
  it('unknown-View zeigt Banner', () => {
    const html = renderToStaticMarkup(<AppShellView initialPath="/devd/backlog" forceBanner />)
    expect(html).toContain('data-ui="boot.unknown-host-banner"')
  })
})
