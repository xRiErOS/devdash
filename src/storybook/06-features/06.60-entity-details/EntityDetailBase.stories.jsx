/**
 * EntityDetailBase — Präsentationale Terminal-Shell (entity-agnostisch).
 * Merged story (GF-429, 06.60 EntityDetails): generische Struktur · In-Shell-Kontext ·
 * Farb-Leiter-Referenz. Konsolidiert aus EntityDetailBase + EntityDetailInShell +
 * IssueDetailsColorLadder (05.70, entfernt).
 */
import EntityDetailBase from '../../../components/ui/organisms/EntityDetailBase.jsx'
import AppShell from '../../../components/ui/organisms/AppShell.jsx'
import IssueDetails from '../../../components/ui/organisms/IssueDetails.jsx'
import MemoryDetails from '../../../components/ui/organisms/MemoryDetails.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'
import AccordionSection from '../../../components/ui/molecules/AccordionSection.jsx'
import EntityDetailHeader from '../../../components/ui/molecules/EntityDetailHeader.jsx'

// ── Generic shell fixtures ──────────────────────────────────────────────────
function SlotPh({ ratio }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--surface2)_28%,transparent)] p-4 text-center text-[11px] text-[var(--overlay1)]">
      {ratio} · Organismus rastet hier ein
    </div>
  )
}

const HEADER = {
  id: 'ID',
  title: 'Entität · Titel',
  goal: 'Goal / Langtitel der Entität — generischer Platzhalter (kein Mock).',
  pills: [
    { k: 'a', label: 'feld', value: 'wert', tone: 'peach' },
    { k: 'b', label: 'feld', value: 'wert', tone: 'blue' },
    { k: 'c', label: 'feld', value: 'wert', tone: 'mauve' },
  ],
}

const SECTIONS = [1, 2, 3].map((n) => ({
  id: `s${n}`,
  no: `0${n}`,
  title: `Abschnitt ${n}`,
  hint: 'Titel + 2 Slots (2fr / 1fr)',
  defaultOpen: n === 1,
  rows: [{
    left: { title: 'slot-left', content: <SlotPh ratio="2fr" /> },
    right: { title: 'slot-right', content: <SlotPh ratio="1fr" /> },
  }],
}))

// ── In-Shell fixtures ────────────────────────────────────────────────────────
const ISSUE = {
  id: 'DD-251', title: 'MetaCardWidget',
  goal: 'Verdichtete Metadaten einer Entität als wiederverwendbares Card-Widget — Goal, Status und Kerndaten auf einen Blick, ohne Edit-Last im Header.',
  priority: 'hoch', status: 'active', type: 'feature',
  meta: [['ID', 'DD-251'], ['Erstellt', 'vor 3 Tagen'], ['Owner', '—'], ['Sprint', 'DD#56'], ['Punkte', '5']],
  tags: [{ value: 'frontend', label: 'frontend', color: 'blue' }, { value: 'a11y', label: 'a11y', color: 'green' }],
  attachments: [{ key: 'a1', name: 'review.png', size: '184 KB' }, { key: 'a2', name: 'spec.pdf', size: '12 KB' }],
}

const MEMORY = {
  id: 'MEM-12', title: 'SSTD = DevDash-DB (Master)',
  goal: 'Architektur-Entscheidung: SSTD-Master liegt in der DevDash-DB, nicht im Vault.',
  category: 'architecture_decision', anchor: 'D01', status: 'active',
  meta: [['Category', 'architecture_decision'], ['Anchor', 'D01'], ['Area', 'AI'], ['Scope', 'Zentral'], ['Erstellt', '2026-06-15']],
  relations: [['Verwandt', '× 2'], ['Cross-Refs', '× 1'], ['Supersedes', '—']],
  history: [['erfasst', '2026-06-15'], ['Revisionen', '1']],
}

// ── Farb-Leiter helpers ──────────────────────────────────────────────────────
const noop = () => {}

function Field({ children, dataUi }) {
  return (
    <div data-ui={dataUi} className="mt-[5px] max-w-[64ch] rounded-[7px] border border-[var(--border)] bg-[var(--layer-4)] px-[11px] py-[9px] text-[13.5px] leading-[1.55] text-[var(--text)]">
      {children}
    </div>
  )
}

function Sub({ label, dataUi }) {
  return (
    <div data-ui={dataUi} className="mt-3 mb-1 flex items-center gap-[6px] text-[12px] font-semibold">
      <span className="inline-block h-[6px] w-[6px] rounded-full bg-[var(--teal)]" />
      <span className="text-[var(--teal)]">{label}</span>
    </div>
  )
}

function Widget({ heading, dataUi, children }) {
  return (
    <div data-ui={dataUi} className="group rounded-[9px] border border-[var(--border)] bg-[var(--layer-3)] p-[14px_16px_16px]">
      <div data-ui={`${dataUi}.heading`} className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
        <span className="h-[7px] w-[7px] flex-none rounded-[2px] bg-[var(--heading-accent)]" />
        <span className="text-[var(--heading-accent)]">{heading}</span>
        <span className="ms-auto inline-flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Icon name="edit" size={15} className="cursor-pointer hover:text-[var(--text)]" />
          <Icon name="copy" size={15} className="cursor-pointer hover:text-[var(--text)]" />
          <Icon name="delete" role="neutral" size={15} className="cursor-pointer hover:text-[var(--text)]" />
        </span>
      </div>
      <div data-ui={`${dataUi}.content`}>{children}</div>
    </div>
  )
}

function ColorLadder() {
  return (
    <div data-ui="screen.ladder" className="h-full bg-[var(--layer-bg)] p-2">
      <AppShell contentBgClass="bg-[var(--layer-bg)]">
        <>
          <EntityDetailHeader
            id="DD-251"
            title="Tastatur-Navigation der Issue-Liste"
            goal="Power-User steuern die Issue-Liste vollständig per Tastatur — ohne Maus, ohne Kontextwechsel."
            pills={[{ k: 'prio', value: 'hoch', tone: 'peach' }, { k: 'status', value: 'to_review', tone: 'blue' }, { k: 'type', value: 'feature', tone: 'mauve' }]}
            className="[--surface0:var(--layer-1)]"
          />
          <div data-ui="screen.ladder.accordion" className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--layer-2)]">
            <AccordionSection open no="01" title="Issue Details" hint="Beschreibung · Metadaten · Aktionen · Review" panelId="lad-01" onToggle={noop}>
              <div data-ui="screen.ladder.wsection" className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1.7fr_1fr]">
                <div className="flex flex-col gap-3">
                  <Widget heading="Beschreibung" dataUi="screen.ladder.w-desc">
                    <Sub label="Goal" dataUi="screen.ladder.w-desc.sub-goal" />
                    <Field dataUi="screen.ladder.w-desc.f-goal">Nutzer navigiert die Issue-Liste per Tastatur — Pfeiltasten bewegen die Auswahl, Enter öffnet das Detail.</Field>
                    <Sub label="Background" dataUi="screen.ladder.w-desc.sub-bg" />
                    <Field dataUi="screen.ladder.w-desc.f-bg">Bestehende Liste hat keine Keyboard-Steuerung; Power-User verlieren Zeit mit der Maus.</Field>
                  </Widget>
                  <Widget heading="PO-Notes" dataUi="screen.ladder.w-po">
                    <Field dataUi="screen.ladder.w-po.f">Fokus-Ring klar sichtbar halten (a11y). Scope: nur Liste, nicht das Board.</Field>
                  </Widget>
                </div>
                <div className="flex flex-col gap-3">
                  <Widget heading="Metadaten" dataUi="screen.ladder.w-meta">
                    <div data-ui="screen.ladder.w-meta.rows" className="mt-[6px] text-[13px]">
                      {[['ID', 'DD-251'], ['Status', 'to_review'], ['Priorität', 'hoch'], ['Sprint', 'DD#62'], ['Owner', 'Erik']].map(([k, val]) => (
                        <div key={k} className="flex justify-between py-[4px]">
                          <span className="text-[var(--subtext0)]">{k}</span><span className="text-[var(--text)]">{val}</span>
                        </div>
                      ))}
                    </div>
                  </Widget>
                </div>
              </div>
            </AccordionSection>
            <AccordionSection no="02" title="Relations & Attachments" hint="User Stories · Tags · Abhängigkeiten · Aktivität" panelId="lad-02" onToggle={noop}>
              <div data-ui="screen.ladder.wsection-2" className="p-3 text-[13px] text-[var(--subtext0)]">(eingeklappt)</div>
            </AccordionSection>
          </div>
        </>
      </AppShell>
    </div>
  )
}

// ── Story meta ───────────────────────────────────────────────────────────────
const meta = {
  title: '06 FEATURES/06.60 Entity Details/EntityDetailBase',
  component: EntityDetailBase,
  tags: ['status:review', 'qa_behavioral:open', 'design_version:v2'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Präsentationale Terminal-Shell der EntityDetail V2 (entity-agnostisch). Nur generische Struktur — Header-Felder + pro Abschnitt Titel/Hint + zwei benannte Slots (slot-left 2fr / slot-right 1fr). KEINE Mock-Daten (Abgrenzung zu IssueDetails/SprintDetails/…). Variant_*InShell = echte Entities im AppShell-Kontext. Variant_ColorLadder = kanonische 6-Ebenen-Leiter (token-getrieben, theme-automatisch).',
      },
    },
  },
}
export default meta

export const Default = {
  render: () => (
    <div data-ui="organism.entity-detail-base.default">
      <EntityDetailBase header={{ id: 'ID', title: 'Entität · Titel' }} />
    </div>
  ),
}

export const Main = {
  render: () => (
    <div data-ui="organism.entity-detail-base.main">
      <EntityDetailBase header={HEADER} sections={SECTIONS} />
    </div>
  ),
}

export const Variant_Composition = {
  render: () => (
    <div data-ui="organism.entity-detail-base.composition">
      <EntityDetailBase header={HEADER} sections={SECTIONS.map((s) => ({ ...s, defaultOpen: true }))} />
    </div>
  ),
}

export const Variant_IssueInShell = {
  name: 'Issue · in AppShell',
  parameters: { fullBleed: true },
  globals: { viewport: { value: 'desktop' } },
  render: () => (
    <div data-ui="screen.entity-detail.issue-in-shell" className="h-full">
      <AppShell><IssueDetails data={ISSUE} /></AppShell>
    </div>
  ),
}

export const Variant_MemoryInShell = {
  name: 'Memory · in AppShell',
  parameters: { fullBleed: true },
  globals: { viewport: { value: 'desktop' } },
  render: () => (
    <div data-ui="screen.entity-detail.memory-in-shell" className="h-full">
      <AppShell><MemoryDetails data={MEMORY} /></AppShell>
    </div>
  ),
}

export const Variant_ColorLadder = {
  name: 'Farb-Leiter (6 Ebenen)',
  parameters: { fullBleed: true },
  globals: { viewport: { value: 'desktop' } },
  render: () => <ColorLadder />,
}
