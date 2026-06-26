# apps/frontend — Frontend-weite Regeln

Gilt für **alles** unter `apps/frontend/src` (Prod-Screens UND Storybook-Insel).
Storybook-spezifische Konventionen → `src/ui/CLAUDE.md`. Repo-weite Regeln → Root `CLAUDE.md`.

## Token & Stil (hart)

- **Token-Master = `src/index.css`** (Tailwind v4, Catppuccin) — Single Source. `DESIGN.md` spiegelt nur; bei Konflikt gewinnt die CSS.
- **0 inline `style={{}}`**, **0 Roh-Hex** (`#abc`) in `src/`. Farben/Spacing nur über Token (`var(--token)`) bzw. Tailwind-Klassen-Map.
- Mikro-Spacing unter 8px + Border-Widths = feste px-Tokens.
- **Tailwind v4 Radius-Trap (DD-483):** `rounded-lg/md/xl` liest `var(--radius-*)` → Radius-Tokens gehören in `@theme`, NICHT `:root` (`:root`-Override wirkt „kindisch rund", DD-469). `@theme` triggert Stylelint `at-rule-no-unknown` → lokal mit `/* stylelint-disable */` kapseln.

## Komponenten

- Bauteile liegen in **`src/ui/<tier>/`** — co-located mit `.stories.jsx` + `.mdx`.
- Tiers: `foundations/` · `atoms/` · `molecules/` · `organisms/base/` · `organisms/complex/` · `screens/`
- **Eine Kopie = Alignment-Garantie:** kein Driften möglich. Keine rohen `button`/`input`/`select` — Atom verwenden. Layout nur über Primitives (Stack/Cluster/Grid/Switcher/Sidebar aus `foundations/`).

## Icons

- Immer über die **Registry**: `import Icon from '../ui/foundations/Icon.jsx'` (Single-Source `iconRegistry.js`). **Kein** freeform `lucide-react`-Import, **kein Emoji**.
- Rollen→Token fix: `success`→`--accent-success` · `danger`→`--accent-danger` · `info`→`--accent-info` · `warning`→`--accent-warning` · `neutral`→`--subtext0`.

## Test-Netz (das einzige)

- **Render-Smoke** `tests/frontend-render-smoke/` (Root-Suite, node-env, `renderToStaticMarkup`): jede `src/ui/**/*.stories.{js,jsx}` muss fehlerfrei zu nicht-leerem Markup rendern. Läuft via `npm test`.
- Verhalten/Logik: TDD (vitest node-env, SSR, kein jsdom) — Muster: `tests/dd534-bottom-tab/bottom-tab.test.jsx`. Reine Präsentation → Augenschein im Storybook, kein Test.

## Storybook-Setup (Referenz)

- `.storybook/main.js`: globt `src/ui/**` (co-located Stories). `viteFinal` strippt `vite-plugin-pwa` (SW bricht `build-storybook`). `core.allowedHosts: true` + `server.allowedHosts: true` (Tailscale-Remote-Review).
- Start: `npm run storybook` (Port 6006). Hängt bei 0% → `rm -rf node_modules/.vite node_modules/.cache`.
