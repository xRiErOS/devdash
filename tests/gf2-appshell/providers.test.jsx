// tests/gf2-appshell/providers.test.jsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Providers } from '../../src/screens/_shell/Providers.jsx'

describe('Providers', () => {
  it('rendert children innerhalb des Provider-Stacks', () => {
    const html = renderToStaticMarkup(<Providers><div data-ui="probe">x</div></Providers>)
    expect(html).toContain('data-ui="probe"')
  })
})
