/**
 * GF — 01 FOUNDATIONS / 01.15 Color Hierarchy.
 * Design-Studie: wie die Catppuccin-Surface-Leiter von hinten nach vorne
 * (crust → overlay) als Elevations-Hierarchie einzusetzen ist, plus die
 * Full-Stack-Achsen (Border / Text-Tiefe / Akzent / Schatten). Spiegelt den
 * Token-Master src/index.css (D02). Styling nur über ./color-hierarchy.css
 * (var()-Klassen) — 0 inline-style, 0 Raw-Hex im JSX.
 */
import './color-hierarchy.css'

const meta = {
  title: '01 FOUNDATIONS/01.15 Color Hierarchy/Color Hierarchy',
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

// Back-to-front: tiefster Grund zuerst, Vordergrund-Marker zuletzt.
const LAYERS = [
  ['crust', 'Tiefster Grund · Wells', 'App-Außenrand, Eingabe-Wells, Code-/Terminal-Blöcke', 0],
  ['mantle', 'Chrome · Gerüst', 'AppShell Rail + Topbar, Nav-Leisten, fixe Rahmen-Flächen', 1],
  ['base', 'Canvas · Default-Fläche', 'Body, Seiten-Hintergrund, Content-Outlet (AppShell.content)', 2],
  ['surface0', 'Panel · Karte', 'EntityDetail-Card, Milestone-Tiles, gehobene Panels', 3],
  ['surface1', 'Karte-in-Karte · Trennlinie', 'verschachtelte Felder, Default-Border-Ton (--border)', 4],
  ['surface2', '4. Rang · dichte Differenzierung', 'Child-im-Child, dichte Dashboards/Listen — vorderste statische Fläche', 5],
  ['overlay0', 'Vordergrund-Marker', 'Grip-Icons, Disabled-Text, Index-/Zähler-Glyphen (Text/Marker, kein Fill)', 6],
]

function Ladder() {
  return (
    <div className="ch-ladder" data-ui="fnd.hier.ladder">
      {LAYERS.map(([token, role, use, indent]) => (
        <div className={`ch-layer ch-indent-${indent}`} key={token} data-ui={`fnd.hier.layer.${token}`}>
          <div className={`ch-layer__chip ch-chip--${token}`}>{token}</div>
          <div className="ch-layer__meta">
            <span className="ch-layer__role">{role}</span>
            <span className="ch-layer__use">{use}</span>
            <span className="ch-layer__token">var(--{token})</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Axes() {
  return (
    <div className="ch-axes" data-ui="fnd.hier.axes">
      <div className="ch-axis" data-ui="fnd.hier.axis.border">
        <span className="ch-axis__title">Border — Trennung</span>
        <div className="ch-axis__row"><span className="ch-swatch-dot ch-dot--surface1" /><span className="ch-axis__label"><b>--border</b> (text·14%) / surface1</span></div>
        <span className="ch-axis__label">Hairline zwischen benachbarten Schichten — nie eine eigene Fläche, nur Kanten-Kontrast.</span>
      </div>
      <div className="ch-axis" data-ui="fnd.hier.axis.text">
        <span className="ch-axis__title">Text-Tiefe</span>
        <div className="ch-axis__row"><span className="ch-swatch-dot ch-dot--text" /><span className="ch-axis__label ch-text-text"><b>text</b> — Primär</span></div>
        <div className="ch-axis__row"><span className="ch-swatch-dot ch-dot--subtext0" /><span className="ch-axis__label ch-text-subtext0">subtext0 — Sekundär</span></div>
        <div className="ch-axis__row"><span className="ch-swatch-dot ch-dot--overlay0" /><span className="ch-axis__label ch-text-overlay0">overlay0 — Tertiär / Meta</span></div>
      </div>
      <div className="ch-axis" data-ui="fnd.hier.axis.accent">
        <span className="ch-axis__title">Akzent — sparsam</span>
        <div className="ch-axis__row"><span className="ch-swatch-dot ch-dot--peach" /><span className="ch-axis__label"><b>accent-primary</b> (peach)</span></div>
        <span className="ch-axis__label">Nur interaktiv/aktiv: Prompt-Glyphe ❯, aktive Rail-Kante ▸, Primär-Tag. Niemals als Fläche.</span>
      </div>
      <div className="ch-axis" data-ui="fnd.hier.axis.shadow">
        <span className="ch-axis__title">Schatten — Abheben</span>
        <div className="ch-shadow-box ch-shadow-card">shadow-card · Panels</div>
        <div className="ch-shadow-box ch-shadow-pop">shadow-pop · Overlays</div>
      </div>
      <div className="ch-axis" data-ui="fnd.hier.axis.state">
        <span className="ch-axis__title">State — rang-agnostisch</span>
        <div className="ch-state-row">
          <span className="ch-state-chip ch-state-chip--rest">rest</span>
          <span className="ch-state-chip ch-state-chip--hover">hover</span>
          <span className="ch-state-chip ch-state-chip--active">active</span>
        </div>
        <span className="ch-axis__label"><b>--state-hover</b> (text·6%) / <b>--state-active</b> (text·10%) — text-mix-Overlay auf JEDER Sprosse, verbraucht die Leiter nicht.</span>
      </div>
    </div>
  )
}

function WidgetLadder() {
  return (
    <div className="ch-wl" data-ui="fnd.hier.widgetladder">
      <div className="ch-wl__panel" data-ui="fnd.hier.wl.panel">
        <span className="ch-wl__panelhead">ContentWrapper · Accordion = layer-2 (Titel + Content = EINE Ebene)</span>
        <div className="ch-wl__widget" data-ui="fnd.hier.wl.widget">
          <span className="ch-wl__widgetlabel" data-ui="fnd.hier.wl.heading">
            <span className="ch-wl__dot" aria-hidden="true" />
            DependencyWidget · WidgetBase = layer-3 (Fill) · Slot-Heading = heading-accent
          </span>
          <div className="ch-wl__child" data-ui="fnd.hier.wl.child">
            <span className="ch-wl__childtitle">Baustein · DetailsSection = layer-4 <span className="ch-wl__tokentag">var(--layer-4)</span></span>
            <span className="ch-wl__childline">Felder/Abschnitte im Widget tragen Layer-4-Fill — eine Stufe vor die WidgetBase.</span>
            <div className="ch-wl__inner">Inhalt · Text/Pills = Layer-5 (Vordergrund, kein Fill)</div>
          </div>
          <div className="ch-wl__child ch-wl__child--hover" data-ui="fnd.hier.wl.child.hover">
            <span className="ch-wl__childtitle">Baustein mit Hover-State <span className="ch-wl__tokentag">+ --state-hover</span></span>
            <span className="ch-wl__childline">Hover/Active = text-mix-Overlay, kein Surface-Schritt.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Shell({ caption }) {
  return (
    <div className="ch-shell" data-ui="fnd.hier.shell">
      <div className="ch-shell__topbar">
        <span className="ch-shell__prompt">❯</span>
        <span>~/devd</span>
        <span className="ch-layer__token">/</span>
        <span className="ch-shell__pathlast">backlog</span>
      </div>
      <div className="ch-shell__body">
        <div className="ch-shell__rail">
          <div className="ch-rail__item ch-rail__item--active"><span className="ch-rail__caret">▸</span><span className="ch-rail__idx">[01]</span>Issues</div>
          <div className="ch-rail__item"><span className="ch-rail__idx">[02]</span>Sprints</div>
          <div className="ch-rail__item"><span className="ch-rail__idx">[03]</span>Roadmap</div>
        </div>
        <div className="ch-shell__content">
          <div className="ch-card">
            <span className="ch-tag">DD-512</span>
            <span className="ch-card__title">EntityDetail · surface0</span>
            <span className="ch-card__line">Panel hebt sich von base ab — eine Stufe nach vorne.</span>
            <div className="ch-card__nested">verschachteltes Feld · surface1 + surface2-Border</div>
          </div>
        </div>
      </div>
      {caption ? <span className="ch-shell__caption">{caption}</span> : null}
    </div>
  )
}

export const Overview = {
  name: 'Overview',
  render: () => (
    <div data-ui="fnd.hier.overview">
      <h3 className="font-display text-sm mb-2">Elevations-Leiter — von hinten (crust) nach vorne (overlay)</h3>
      <Ladder />
      <h3 className="font-display text-sm mb-2 mt-6">Full-Stack-Achsen — Border · Text · Akzent · Schatten</h3>
      <Axes />
    </div>
  ),
}

export const Applied = {
  name: 'Applied — AppShell & Card-in-Card',
  render: () => (
    <div data-ui="fnd.hier.applied">
      <h3 className="font-display text-sm mb-2">Angewandt: base (Canvas) → mantle (Chrome) → base (Content) → surface0 (Card) → surface1 (Nested)</h3>
      <Shell />
    </div>
  ),
}

export const WidgetLayer = {
  name: 'Widget Layer — IssueDetails',
  parameters: {
    docs: { description: { story: 'Das EntityDetail-Innenleben im 6-Ebenen-Modell (PO 2026-06-20). Regel: ContentWrapper (Accordion) = layer-2 (Titel + Content = EINE Ebene); die WidgetBase BEKOMMT Fill = layer-3 (supersedet die frühere Widget-transparent-Studie); Bausteine/DetailsSection = layer-4; der Slot-Heading ist Layer-5 Vordergrund (--heading-accent + Dot, kein Fill). State (Hover/Active) ist ein rang-agnostisches --state-*-Overlay, kein Surface-Schritt.' } },
  },
  render: () => (
    <div data-ui="fnd.hier.widgetlayer">
      <h3 className="font-display text-sm mb-2">Widget-Schicht (6-Ebenen): layer-2 (Accordion) → layer-3 (WidgetBase, Fill) → layer-4 (Baustein) → layer-5 (Vordergrund)</h3>
      <WidgetLadder />
    </div>
  ),
}

export const ThemeComparison = {
  name: 'Theme Comparison — Latte vs. Macchiato',
  parameters: {
    docs: { description: { story: 'Gleiche Hierarchie, beide Themes gleichzeitig. Die semantische Leiter (crust→overlay) ist identisch — nur die Luminanz-Richtung kippt: Macchiato wird heller je näher am Betrachter, Latte wird dunkler.' } },
  },
  render: () => (
    <div className="ch-compare" data-ui="fnd.hier.compare">
      <div className="ch-compare__col" data-ui="fnd.hier.compare.latte">
        <span className="ch-compare__head">Latte (light) — näher = dunkler</span>
        <div className="ch-compare__pane ch-theme--latte">
          <Shell caption="base → surface0 → surface1: Flächen werden nach vorne dunkler." />
        </div>
      </div>
      <div className="ch-compare__col" data-ui="fnd.hier.compare.macchiato">
        <span className="ch-compare__head">Macchiato (dark) — näher = heller</span>
        <div className="ch-compare__pane ch-theme--macchiato">
          <Shell caption="base → surface0 → surface1: Flächen werden nach vorne heller." />
        </div>
      </div>
    </div>
  ),
}
