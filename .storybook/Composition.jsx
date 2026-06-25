import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Liest die aktiven Catppuccin-Tokens (Latte = :root / Macchiato = html[data-theme="dark"])
// live vom :root und mappt sie auf mermaid themeVariables. So folgt das Diagramm dem
// Storybook-Canvas statt eines hart verdrahteten theme:'dark' (DD-GF2, Readability-Fix).
function readTokens() {
  const cs = getComputedStyle(document.documentElement)
  const v = (name) => cs.getPropertyValue(name).trim()
  return {
    isDark: document.documentElement.getAttribute('data-theme') === 'dark',
    base: v('--base'),
    mantle: v('--mantle'),
    surface0: v('--surface0'),
    surface1: v('--surface1'),
    overlay0: v('--overlay0'),
    text: v('--text'),
    subtext0: v('--subtext0'),
  }
}

function buildThemeVariables() {
  const t = readTokens()
  return {
    darkMode: t.isDark,
    background: t.base,
    mainBkg: t.surface0,
    primaryColor: t.surface0,
    primaryBorderColor: t.overlay0,
    primaryTextColor: t.text,
    secondaryColor: t.surface1,
    tertiaryColor: t.mantle,
    nodeBorder: t.overlay0,
    lineColor: t.subtext0,
    textColor: t.text,
    edgeLabelBackground: t.mantle,
    titleColor: t.text,
  }
}

let counter = 0
export function Composition({ children }) {
  const ref = useRef(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let cancelled = false
    const draw = () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: buildThemeVariables(),
      })
      const id = `composition-${counter++}`
      mermaid
        .render(id, String(children).trim())
        .then(({ svg }) => {
          if (!cancelled && ref.current) ref.current.innerHTML = svg
        })
        .catch((e) => {
          if (!cancelled) setError(e.message)
        })
    }
    draw()
    // Re-render bei Theme-Umschaltung (preview.jsx setzt html[data-theme]).
    const obs = new MutationObserver(draw)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      cancelled = true
      obs.disconnect()
    }
  }, [children])
  if (error) return <pre style={{ color: 'crimson' }}>Mermaid-Fehler: {error}</pre>
  return <div ref={ref} data-ui="composition-diagram" />
}

export default Composition
