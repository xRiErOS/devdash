/**
 * MermaidDocs — client-seitiges Mermaid-Rendering für MDX-Docs (DD2).
 *
 * Warum nicht rehype-mermaid: dessen `inline-svg`-Strategie braucht zur Build-Zeit
 * einen Playwright-Chromium (im Repo nicht installiert) und greift in SB10
 * addon-docs nicht zuverlässig — ```mermaid-Fences blieben roher Code (Playwright-
 * Augenschein 2026-06-26: 0 SVG, `code.language-mermaid` im DOM). Stattdessen: das
 * mermaid-Paket (11.x, ohnehin da) rendert im Browser. Über `parameters.docs.
 * components.code` greift das global — sowohl die generierten Kompositions-
 * Diagramme (gen-composition) ALS AUCH die handgepflegten data-ui-Anker.
 */
import { useEffect, useRef, useId } from 'react'
import mermaid from 'mermaid'

function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function Mermaid({ chart }) {
  const ref = useRef(null)
  // Stabile, kollisionsfreie ID ohne Math.random/Date (SSR-/Resume-sicher).
  const renderId = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  useEffect(() => {
    if (typeof document === 'undefined' || !ref.current) return undefined
    let cancelled = false
    // Catppuccin-Tokens aus dem aktiven Theme (data-theme) lesen → Latte/Macchiato.
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        background: cssVar('--base', '#eff1f5'),
        primaryColor: cssVar('--surface0', '#ccd0da'),
        primaryTextColor: cssVar('--text', '#4c4f69'),
        primaryBorderColor: cssVar('--overlay0', '#9ca0b0'),
        lineColor: cssVar('--overlay1', '#8c8fa1'),
        textColor: cssVar('--text', '#4c4f69'),
        fontFamily: cssVar('--font-sans', 'system-ui'),
      },
    })
    mermaid
      .render(renderId, chart)
      .then(({ svg }) => { if (!cancelled && ref.current) ref.current.innerHTML = svg })
      .catch((e) => { if (!cancelled && ref.current) ref.current.textContent = `Mermaid-Fehler: ${e.message}` })
    return () => { cancelled = true }
  }, [chart, renderId])
  return <div className="dd-mermaid" data-ui="foundation.mermaid" ref={ref} />
}

/**
 * MDX-`code`-Override: Mermaid-Fences → <Mermaid/>, alles andere unverändert
 * (Inline-Code + sonstige Sprachen behalten ihr Standard-Rendering).
 */
export function MdxCode({ className = '', children, ...rest }) {
  if (/\blanguage-mermaid\b/.test(className)) {
    return <Mermaid chart={String(children).replace(/\n$/, '')} />
  }
  return <code className={className} {...rest}>{children}</code>
}
