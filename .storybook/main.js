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
 */

import fs from 'node:fs'
import path from 'node:path'

// PO-Review-Store (greenfield P0.2): Live-Write der Storybook-Annotationen aus dem
// erweiterten Debug-Mode nach specs-DD/02-RPDs/Greenfield-2/po-review.json. Nur Dev-Server-Middleware.
const poReviewPlugin = {
  name: 'po-review-store',
  configureServer(server) {
    server.middlewares.use('/__po-review', (req, res) => {
      const file = path.resolve(process.cwd(), 'specs-DD/02-RPDs/Greenfield-2/po-review.json')
      const load = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return {} } }
      if (req.method === 'GET') {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(load()))
        return
      }
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          try {
            const { storyId, data } = JSON.parse(body || '{}')
            if (!storyId) { res.statusCode = 400; res.end('{"error":"no storyId"}'); return }
            const cur = load()
            if (data == null) delete cur[storyId]
            else cur[storyId] = data
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, JSON.stringify(cur, null, 2))
            res.setHeader('content-type', 'application/json')
            res.end('{"ok":true}')
          } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: String(e) })) }
        })
        return
      }
      res.statusCode = 405
      res.end()
    })
  },
}

/** @type {import('@storybook/react-vite').StorybookConfig} */
export default {
  // GF-2 (GF-203): MDX-Doku + CSF-Stories. NUR die kuratierte Insel `src/storybook/**`
  // (status:stable/review) — die 122 co-located Archiv-Stories (status:archive, in
  // src/components/**, src/views/**) bleiben aus dem nativen Katalog (Rauschen, 2026-06-20).
  // Trennung verifiziert: 0 live-Stories außerhalb der Insel, 0 archive innerhalb.
  // Voll-Katalog inkl. Archiv on-demand via `.storybook-archive/` → `npm run storybook:archive`.
  //
  // Mockup-Room (Phase 0): `SB_DRAFTS=1 npm run storybook:mock` lädt die git-ignored Drafts
  // aus `mockups/**` ZUSÄTZLICH zur Insel in DERSELBEN Instanz (echte Stories bleiben zum
  // Nachschlagen gemountet). Ohne Flag (Default + `build-storybook`-Gate) ist `mockups/`
  // unsichtbar — ein kaputter Draft kann den Build-Gate nie crashen.
  stories: ['../src/storybook/**/*.mdx', '../src/storybook/**/*.stories.@(js|jsx)'],

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
    config.plugins.push(poReviewPlugin)
    return config
  },

  // GF-2 P0 (GF-202): addon-docs (MDX + Autodocs) + addon-a11y (WCAG 2.2 AA,
  // informativ/Panel — kein hartes Gate ohne CT-Runner, Q02).
  // CT-Runner-Infra (chore/test-ct-runner-msw): addon-vitest führt Stories als
  // vitest-Browser-Tests aus (play-Functions + optional a11y-Gate). MSW (P3) via
  // msw-storybook-addon in preview.jsx + public/mockServiceWorker.js verdrahtet.
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-mcp', '@storybook/addon-vitest']
};
