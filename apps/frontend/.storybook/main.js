/**
 * Storybook 10 (react-vite) — Komponenten-Katalog + Pattern-Doku (DD-470).
 *
 * Score-0-Kriterium K1.6 des Konformitäts-Audits: vor DD#61 existierte weder
 * Storybook noch ein docs/components-Verzeichnis. PO-Entscheidung D02: voller
 * Storybook-Katalog (kein leichtgewichtiges Markdown).
 *
 * viteFinal entfernt das PWA-Plugin aus der gemergten Projekt-vite.config —
 * der Service-Worker-Build (vite-plugin-pwa) ist im Storybook-Kontext sinnlos
 * und bricht den statischen Katalog-Build. Tailwind + React-Plugin bleiben,
 * damit die Token-Klassen (var(--*)) im Katalog korrekt rendern.
 *
 * D3 (2026-06-26, revidiert): Mermaid in MDX = client-seitig (preview.jsx
 * `docs.components.code` → .storybook/MermaidDocs.jsx). rehype-mermaid wurde
 * verworfen: dessen inline-svg braucht Build-Chromium (fehlt) und griff in SB10
 * addon-docs nicht — Fences blieben roher Code (Playwright-Augenschein 2026-06-26).
 * Betrifft NUR die MDX-Doku — der Render-Smoke globt ausschließlich *.stories.{js,jsx}.
 */

/** @type {import('@storybook/react-vite').StorybookConfig} */
export default {
  // src/ui/** — co-located: Komponenten + Stories + MDX liegen nebeneinander.
  // Struktur: foundations/ · atoms/ · molecules/ · organisms/base/ · organisms/complex/ · screens/
  stories: [
    '../src/ui/**/*.mdx', '../src/ui/**/*.stories.@(js|jsx)',
  ],

  // Storybook-10-Dev-Server hat eine EIGENE Host-Validierung (core-server
  // getHostValidationMiddleware), unabhängig von viteFinal server.allowedHosts.
  // Ohne core.allowedHosts liefert der Tailscale-Host (mac-mini-…ts.net) 403
  // "Invalid host". true = Check deaktiviert (Mac→ThinkPad-Remote-Review).
  core: {
    allowedHosts: true,
    // CT-Runner: deterministische/rauschfreie Test- + CI-Läufe.
    disableTelemetry: true,
  },

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  async viteFinal(config) {
    const flat = (config.plugins || []).flat(Infinity)
    config.plugins = flat.filter((p) => {
      const name = p && typeof p === 'object' ? String(p.name || '') : ''
      return !name.toLowerCase().includes('pwa')
    })
    config.server = {
      ...config.server,
      host: true,
      allowedHosts: true,
    }
    return config
  },

  // GF-2 P0 (GF-202): addon-docs (MDX + Autodocs) + addon-a11y (WCAG 2.2 AA,
  // informativ/Panel — kein hartes Gate ohne CT-Runner, Q02).
  // CT-Runner-Infra (chore/test-ct-runner-msw): addon-vitest führt Stories als
  // vitest-Browser-Tests aus (play-Functions + optional a11y-Gate). MSW (P3) via
  // msw-storybook-addon in preview.jsx + public/mockServiceWorker.js verdrahtet.
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-mcp',
    '@storybook/addon-vitest',
  ],
};
