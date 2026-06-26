/**
 * GF-204 — 01 FOUNDATIONS / Design Tokens.
 * Flagship-Foundation-Story: spiegelt den Token-Master src/index.css (D02).
 * Theme-reaktiv über den data-theme-Decorator (Latte/Macchiato). Styling
 * ausschließlich über ./design-tokens.css (var()-Klassen) — 0 inline-style, 0 Hex.
 */
import './design-tokens.css'

const meta = {
  title: '01 FOUNDATIONS/Design Tokens/Design Tokens',
  // status:review — Typography in eigenen Cluster herausgelöst (D04);
  // der reduzierte Token-Knoten braucht PO-Re-Verdict (stable ist PO-exklusiv, DD-186).
  tags: ['status:review'],
  parameters: { layout: 'padded' },
}
export default meta

function Swatch({ name }) {
  return (
    <div className="dt-swatch" data-ui={`fnd.tokens.swatch.${name}`}>
      <div className={`dt-swatch__chip dt--${name}`} />
      <div className="dt-swatch__meta">
        <div className="dt-swatch__name">{name}</div>
        <div className="dt-swatch__var">var(--{name})</div>
      </div>
    </div>
  )
}

function Group({ title, tokens, scope }) {
  return (
    <section className="mb-6" data-ui={`fnd.tokens.group.${scope}`}>
      <h3 className="font-display text-sm mb-2">{title}</h3>
      <div className="dt-grid">
        {tokens.map((t) => <Swatch key={t} name={t} />)}
      </div>
    </section>
  )
}

const BASE = ['crust', 'mantle', 'base', 'surface0', 'surface1', 'surface2', 'overlay0', 'overlay1']
const TEXT = ['text', 'subtext0', 'subtext1', 'hint']
const CATPPUCCIN = ['red', 'peach', 'yellow', 'green', 'teal', 'blue', 'sapphire', 'lavender', 'mauve']
const SEMANTIC = ['accent-primary', 'accent-success', 'accent-danger', 'accent-warning', 'accent-info']

export const Palette = {
  render: () => (
    <div data-ui="fnd.tokens.palette">
      <Group title="Base & Surface" tokens={BASE} scope="base" />
      <Group title="Text" tokens={TEXT} scope="text" />
      <Group title="Catppuccin-Akzente (Tags / Priority)" tokens={CATPPUCCIN} scope="catppuccin" />
    </div>
  ),
}

export const SemanticAccents = {
  name: 'Semantic Accents',
  render: () => <Group title="Semantische Akzente (DD-47 — Komponenten nutzen diese)" tokens={SEMANTIC} scope="semantic" />,
}

export const Spacing = {
  render: () => (
    <div className="dt-spacing" data-ui="fnd.tokens.spacing">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="dt-spacing__row" data-ui={`fnd.tokens.spacing.${n}`}>
          <span className="w-20">space-{n}</span>
          <span className={`dt-spacing__bar dt--w${n}`} />
        </div>
      ))}
    </div>
  ),
}

export const Radius = {
  render: () => (
    <div className="dt-radii" data-ui="fnd.tokens.radius">
      {[['sm', 'rsm'], ['md', 'rmd'], ['lg', 'rlg'], ['xl', 'rxl']].map(([label, cls]) => (
        <div key={cls} className={`dt-radius dt--${cls}`} data-ui={`fnd.tokens.radius.${label}`}>radius-{label}</div>
      ))}
    </div>
  ),
}

export const BordersFocus = {
  name: 'Borders & Focus',
  render: () => (
    <div data-ui="fnd.tokens.borders">
      <div className="dt-borders mb-6" data-ui="fnd.tokens.border-widths">
        <div className="dt-bw-box dt-bw-box--s" data-ui="fnd.tokens.border-width.s">s · 1px</div>
        <div className="dt-bw-box dt-bw-box--m" data-ui="fnd.tokens.border-width.m">m · 2px</div>
        <div className="dt-bw-box dt-bw-box--l" data-ui="fnd.tokens.border-width.l">l · 3px</div>
      </div>
      <div className="dt-borders">
        <div className="dt-border-box" data-ui="fnd.tokens.border">var(--border)</div>
        <div className="dt-focus-box" data-ui="fnd.tokens.focus-ring">focus-ring · l</div>
      </div>
    </div>
  ),
}

const ZINDEX = [['sticky', 100], ['dropdown', 500], ['popover', 800], ['modal', 1000], ['tooltip', 1500]]
export const ZIndex = {
  name: 'Z-Index',
  render: () => (
    <div className="dt-list" data-ui="fnd.tokens.zindex">
      {ZINDEX.map(([k, v]) => (
        <div className="dt-list__row" key={k} data-ui={`fnd.tokens.zindex.${k}`}>
          <span className="dt-list__key">var(--z-index-{k})</span><span>{v}</span>
        </div>
      ))}
    </div>
  ),
}

// Tailwind-v4-Defaults (keine Custom-Tokens). App-relevant: md=Mobile-Density, lg=Two-Pane.
const BREAKPOINTS = [['sm', '640px', 'sm'], ['md', '768px · Mobile-Density', 'md'], ['lg', '1024px · Two-Pane', 'lg'], ['xl', '1280px', 'xl'], ['2xl', '1536px', 'xxl']]
export const Breakpoints = {
  render: () => (
    <div className="dt-bp" data-ui="fnd.tokens.breakpoints">
      {BREAKPOINTS.map(([k, label, cls]) => (
        <div className="dt-bp__row" key={k} data-ui={`fnd.tokens.breakpoint.${k}`}>
          <span className="dt-list__key">{k}</span>
          <span className={`dt-bp__bar dt-bp__bar--${cls}`} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  ),
}

const LH_SAMPLE = 'Mehrzeiliger Beispieltext, der über mehrere Zeilen läuft, um die Zeilenhöhe sichtbar zu machen.'
const LINE_HEIGHTS = [['tight', '1.25'], ['snug', '1.375'], ['normal', '1.5']]
export const LineHeight = {
  name: 'Line Height',
  render: () => (
    <div className="dt-lh" data-ui="fnd.tokens.lineheight">
      {LINE_HEIGHTS.map(([k, v]) => (
        <div className={`dt-lh__box dt-lh__box--${k}`} key={k} data-ui={`fnd.tokens.lineheight.${k}`}>
          {k} · {v} — {LH_SAMPLE}
        </div>
      ))}
    </div>
  ),
}

export const Elevation = {
  render: () => (
    <div className="dt-elev" data-ui="fnd.tokens.elevation">
      <div className="dt-elev__box dt--shadow-card" data-ui="fnd.tokens.elevation.card">shadow-card</div>
      <div className="dt-elev__box dt--shadow-pop" data-ui="fnd.tokens.elevation.pop">shadow-pop</div>
    </div>
  ),
}
