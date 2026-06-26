/**
 * 20 MOCKUPS / Root Z — Konvergenz.
 * Zusammengeführt aus PO-Cherry-Pick (2026-06-25): 3-Spalten, aber
 *   - LINKS: ProjectBrowser (VS-Code-artig, ein-/ausklappbar) — zeigt die
 *     Projekt-Struktur Meilenstein › Sprint › Issue, mit Suche/Sort/Filter +
 *     Umschalt Struktur↔Backlog.
 *   - MITTE: Content; gewähltes Issue inkl. Detail-Meta (a12 eingebettet).
 *   - RECHTS: NavigationRail (ein-/ausklappbar: Icon-only ↔ mit Labels) + Fuß (a5).
 *   - TOP: Breadcrumb (c1) · Command-Bar mittig (b3, ⌘K=a8) · Utils rechts (b4+a9).
 * Beide Stories zeigen inverse Kollaps-Zustände. Codes z1…z15 zum Weiter-Adressieren.
 * Wegwerf-Sandbox (presentational, statisch). Icons nur via Registry.
 */
import { Region, Shell } from './mockup-kit.jsx'
import Icon from '../foundations/Icon.jsx'

const meta = {
  title: '20 MOCKUPS/Root/Z · Konvergenz',
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen', fullBleed: true },
  argTypes: { showCodes: { control: 'boolean', name: 'data-ui Codes zeigen' } },
  args: { showCodes: true },
}
export default meta

const RAIL = [
  { key: 'home', label: 'Tool-Home' },
  { key: 'dashboard', label: 'Projekt-Home', active: true },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'brain', label: 'Memories' },
]
const FOOT = [
  { key: 'stats', label: 'AI-Cost' },
  { key: 'settings', label: 'Settings' },
  { key: 'delete', label: 'Trash' },
]

function Topbar() {
  return (
    <Region code="z1" label="Topbar" corner="bl" className="mk-topbar mk-mantle">
      <Region code="z2" label="Breadcrumb" corner="bl">
        <span className="mk-prompt">❯</span>{' '}
        <span className="mk-path">devd2 / DD#49 <span className="mk-path__last">/ DD2-7</span></span>
      </Region>
      <div className="mk-z__cmd">
        <Region code="z3" label="Command-Bar (⌘K)" corner="bl" className="mk-cmdbar">
          <Icon name="search" size={15} mono />
          <span className="mk-spacer">Suchen, springen, Befehl …</span>
          <span className="mk-kbd"><Icon name="command" size={12} mono /> K</span>
        </Region>
      </div>
      <Region code="z4" label="Utils" corner="bl">
        <span className="mk-utils">
          <div className="mk-iconbtn" title="Theme"><Icon name="theme-dark" size={16} label="Theme" /></div>
        </span>
      </Region>
    </Region>
  )
}

function ProjectBrowser() {
  return (
    <Region code="z5" label="ProjectBrowser" corner="tr" className="mk-pb">
      <div className="mk-pb__head">
        <span>devd2 · Struktur</span>
        <Region code="z6" label="Browser-Toggle" corner="bl">
          <div className="mk-iconbtn" title="Einklappen"><Icon name="chevron-left" size={16} label="Einklappen" /></div>
        </Region>
      </div>
      <div className="mk-pb__tools">
        <div className="mk-pb__toolrow">
          <Region code="z7" label="Suche" corner="tr" className="mk-field">
            <Icon name="search" size={13} mono /> <span className="mk-spacer">Filtern …</span>
          </Region>
          <Region code="z8" label="Sort/Filter" corner="tr">
            <div className="mk-iconbtn" title="Sortieren"><Icon name="sort" size={15} label="Sortieren" /></div>
            <div className="mk-iconbtn" title="Filter"><Icon name="filter" size={15} label="Filter" /></div>
          </Region>
        </div>
        <Region code="z9" label="View-Toggle" corner="tr" className="mk-seg">
          <span className="mk-seg__btn mk-seg__btn--active"><Icon name="layers" size={13} mono /> Struktur</span>
          <span className="mk-seg__btn"><Icon name="backlog" size={13} mono /> Backlog</span>
        </Region>
      </div>
      <Region code="z10" label="Baum (M › S › I) — Entity-Farb-IDs, keine Icons" corner="tr" className="mk-pb__tree">
        <div className="mk-tree">
          <div className="mk-tree__row mk-ind-0"><span className="mk-tree__caret">▾</span><span className="mk-tag mk-tag--milestone">M2</span><span className="mk-tree__lead">Project Home</span></div>
          <div className="mk-tree__row mk-ind-1"><span className="mk-tree__caret">▾</span><span className="mk-tag mk-tag--sprint">DD#49</span><span className="mk-tree__lead">Capture-Sprint</span></div>
          <div className="mk-tree__row mk-ind-2 mk-tree__row--active"><span className="mk-tag mk-tag--issue">DD2-7</span> Capture-Host härten</div>
          <div className="mk-tree__row mk-ind-2"><span className="mk-tag mk-tag--issue">DD2-8</span> Render-Smoke erweitern</div>
          <div className="mk-tree__row mk-ind-1"><span className="mk-tree__caret">▸</span><span className="mk-tag mk-tag--sprint">DD#50</span><span className="mk-tree__lead">Mobile-Sprint</span></div>
          <div className="mk-tree__row mk-ind-0"><span className="mk-tree__caret">▸</span><span className="mk-tag mk-tag--milestone">M3</span><span className="mk-tree__lead">Mobile-Track</span></div>
        </div>
      </Region>
    </Region>
  )
}

function ProjectBrowserCollapsed() {
  return (
    <Region code="z5" label="ProjectBrowser (zu)" corner="tr" className="mk-pbstrip">
      <div className="mk-iconbtn" title="Ausklappen"><Icon name="chevron-right" size={16} label="Ausklappen" /></div>
      <span className="mk-pbstrip__label">STRUKTUR</span>
    </Region>
  )
}

function Content() {
  return (
    <Region code="z11" label="Content" corner="tr" className="mk-content mk-base">
      <Region code="z18" label="Page-Title" corner="tr" className="mk-pagetitle">
        <div className="mk-pagetitle__row">
          <span className="mk-tag mk-tag--issue">DD2-7</span>
          <span className="mk-pagetitle__name">Capture-Host Allowlist härten</span>
          <span className="mk-spacer" />
          <span className="mk-pill">refined</span>
        </div>
        <div className="mk-pagetitle__sub">Browser links = Master, gewähltes Issue füllt den Content inkl. Detail.</div>
      </Region>
      <Region code="" className="mk-card">
        <div className="mk-card__nested">verschachteltes Feld · surface1 — Refinement-Notizen, Akzeptanzkriterien …</div>
      </Region>
    </Region>
  )
}

function MetaPanel() {
  return (
    <Region code="z16" label="Metadaten (c6)" corner="tl" className="mk-meta mk-mantle">
      <div className="mk-pb__head">
        <span>Metadaten</span>
        <Region code="z17" label="Meta-Toggle" corner="bl">
          <div className="mk-iconbtn" title="Einklappen"><Icon name="chevron-right" size={16} label="Einklappen" /></div>
        </Region>
      </div>
      <div className="mk-meta__body">
        <div className="mk-metagrid">
          <span>Status</span><b>refined</b>
          <span>Priorität</span><b>P2</b>
          <span>Sprint</span><b>DD#49</b>
          <span>Typ</span><b>chore</b>
        </div>
      </div>
    </Region>
  )
}

function MetaPanelCollapsed() {
  return (
    <Region code="z16" label="Metadaten (zu)" corner="tl" className="mk-pbstrip mk-pbstrip--right">
      <div className="mk-iconbtn" title="Ausklappen"><Icon name="chevron-left" size={16} label="Ausklappen" /></div>
      <span className="mk-pbstrip__label">METADATEN</span>
    </Region>
  )
}

function RailCollapsed() {
  return (
    <Region code="z13" label="NavigationRail" corner="tr" className="mk-rail mk-mantle">
      <div className="mk-rail__head">
        <Region code="z14" label="Rail-Toggle" corner="br">
          <div className="mk-iconbtn" title="Erweitern"><Icon name="chevron-right" size={16} label="Erweitern" /></div>
        </Region>
      </div>
      <div className="mk-rail__body">
        {RAIL.map((n) => (
          <div key={n.key} className={`mk-navbtn ${n.active ? 'mk-navbtn--active' : ''}`} title={n.label}>
            <Icon name={n.key} role={n.active ? 'primary' : undefined} size={18} label={n.label} />
          </div>
        ))}
        <div className="mk-rail__spacer" />
        <Region code="z15" label="Fuß (a5)" corner="bl">
          {FOOT.map((f) => (
            <div key={f.key} className="mk-navbtn" title={f.label}><Icon name={f.key} size={18} label={f.label} /></div>
          ))}
        </Region>
      </div>
    </Region>
  )
}

function RailWide() {
  return (
    <Region code="z13" label="NavigationRail (auf)" corner="tr" className="mk-rail mk-rail--wide mk-mantle">
      <div className="mk-rail__head">
        <span className="mk-rail__title">Navigation</span>
        <Region code="z14" label="Rail-Toggle" corner="br">
          <div className="mk-iconbtn" title="Einklappen"><Icon name="chevron-left" size={16} label="Einklappen" /></div>
        </Region>
      </div>
      <div className="mk-rail__body">
        {RAIL.map((n) => (
          <div key={n.key} className={`mk-railitem ${n.active ? 'mk-railitem--active' : ''}`}>
            <Icon name={n.key} role={n.active ? 'primary' : undefined} size={18} /> {n.label}
          </div>
        ))}
        <div className="mk-rail__spacer" />
        <Region code="z15" label="Fuß (a5)" corner="bl">
          {FOOT.map((f) => (
            <div key={f.key} className="mk-railitem"><Icon name={f.key} size={18} mono /> {f.label}</div>
          ))}
        </Region>
      </div>
    </Region>
  )
}

export const Konvergenz = {
  name: 'Konvergenz (Browser auf · Rail zu)',
  render: (args) => (
    <Shell variant="z" showCodes={args.showCodes !== false}>
      <Topbar />
      <div className="mk-z__body">
        <RailCollapsed />
        <ProjectBrowser />
        <Content />
        <MetaPanel />
      </div>
    </Shell>
  ),
}

export const Invers = {
  name: 'Invers (Browser zu · Rail auf)',
  render: (args) => (
    <Shell variant="z" showCodes={args.showCodes !== false}>
      <Topbar />
      <div className="mk-z__body">
        <RailWide />
        <ProjectBrowserCollapsed />
        <Content />
        <MetaPanelCollapsed />
      </div>
    </Shell>
  ),
}
