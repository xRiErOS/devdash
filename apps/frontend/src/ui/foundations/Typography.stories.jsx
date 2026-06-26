/**
 * D04 — 01 FOUNDATIONS / Typography (herausgelöst aus Design Tokens).
 * Spiegelt die de-facto genutzte Typo-Skala: Schriftart, Größe (Tailwind text-*),
 * Gewicht, Hinweis-Farbe (DD-47), Überschriften, Text-Hierarchie-Anwendung.
 * Styling nur über ./typography.css (var()-Klassen) — 0 inline-style, 0 Hex.
 * Kein neuer Token: Token-Master bleibt src/index.css (D02).
 */
import './typography.css'

const meta = {
  title: '01 FOUNDATIONS/Typography/Typography',
  // status:review — frisch aus dem DesignTokens-Gott-Knoten herausgelöst (D04),
  // PO-Re-Verdict für den neuen Knoten ausstehend (stable ist PO-exklusiv, DD-186).
  tags: ['status:review'],
  parameters: { layout: 'padded' },
}
export default meta

function Group2({ title, scope, children }) {
  return (
    <section className="dt-type mb-6" data-ui={`fnd.typography.group.${scope}`}>
      <h3 className="font-display text-sm mb-2">{title}</h3>
      {children}
    </section>
  )
}

const SIZES = [
  ['xs', 'text-xs', '0.75rem · 12px'],
  ['s', 'text-sm', '0.875rem · 14px'],
  ['m', 'text-base', '1rem · 16px'],
  ['l', 'text-lg', '1.125rem · 18px'],
  ['xl', 'text-xl', '1.25rem · 20px'],
]
const WEIGHTS = [
  ['normal', 'font-normal', '400'],
  ['medium', 'font-medium', '500'],
  ['bold', 'font-bold', '700'],
]
const HINTS = ['primary', 'danger', 'success', 'info', 'warning']
const HEADINGS = [
  ['h1', 'Überschrift H1', 'font-display · 1.5rem · 700'],
  ['h2', 'Überschrift H2', 'font-display · 1.25rem · 700'],
  ['h3', 'Überschrift H3', 'font-display · 1.125rem · 500'],
]
// Text-Hierarchie — Anwendung (T3.1/D04): wie die bestehenden rem-Sprossen in
// EntityDetail-Kompositionen relational gestaffelt werden. KEIN neuer Token.
// [tier-key, Label, Sample, Spec, dt--Klasse]
const HIERARCHY = [
  ['tier-1', 'Tier-1 · Section-Titel', '[01] ISSUE DETAILS', 'text-lg · 1.125rem · bold · var(--text)', 'dt--hier-tier-1'],
  ['tier-2', 'Tier-2 · Slot-Heading //', '// Beschreibung', 'text-base · 1rem · semibold · var(--subtext0)', 'dt--hier-tier-2'],
  ['tier-3', 'Tier-3 · Inline-Label ///', '/// Background', 'text-sm · 0.875rem · semibold · var(--subtext0)', 'dt--hier-tier-3'],
  ['body', 'Body/Value', 'Lorem ipsum dolor sit amet', 'text-xs · 0.75rem · normal · var(--text)', 'dt--hier-body'],
]

function TypeRow({ label, spec, scope, className, children }) {
  return (
    <div className="dt-type__row" data-ui={`fnd.typography.${scope}`}>
      <span className="dt-type__label">{label}</span>
      <span className={`dt-type__sample ${className}`}>{children}</span>
      <span className="dt-type__spec">{spec}</span>
    </div>
  )
}

export const Typography = {
  render: () => (
    <div data-ui="fnd.typography">
      <Group2 title="Schriftart" scope="font">
        <TypeRow label="Display Regular" spec="var(--font-display) · 400" scope="font.display.regular" className="dt--font-display dt--weight-normal">JetBrains Mono 0123</TypeRow>
        <TypeRow label="Display Medium" spec="var(--font-display) · 500" scope="font.display.medium" className="dt--font-display dt--weight-medium">JetBrains Mono 0123</TypeRow>
        <TypeRow label="Display Bold" spec="var(--font-display) · 700" scope="font.display.bold" className="dt--font-display dt--weight-bold">JetBrains Mono 0123</TypeRow>
        <TypeRow label="Body" spec="var(--font-body) · system-ui" scope="font.body" className="dt--font-body">System-UI Fließtext 0123</TypeRow>
      </Group2>
      <Group2 title="Schriftgröße — Text {xs,s,m,l,xl} (Tailwind-Utility)" scope="size">
        {SIZES.map(([k, util, spec]) => (
          <TypeRow key={k} label={`Text ${k}`} spec={`${util} · ${spec}`} scope={`size.${k}`} className={`dt--text-${k}`}>Beispiel-Text {k}</TypeRow>
        ))}
      </Group2>
      <Group2 title="Schriftgewicht (Tailwind-Utility)" scope="weight">
        {WEIGHTS.map(([k, util, spec]) => (
          <TypeRow key={k} label={k} spec={`${util} · ${spec}`} scope={`weight.${k}`} className={`dt--weight-${k}`}>Gewicht {k}</TypeRow>
        ))}
      </Group2>
      <Group2 title="Hinweis-Texte — semantische Akzentfarbe (DD-47)" scope="hint">
        {HINTS.map((k) => (
          <TypeRow key={k} label={`Hinweis ${k}`} spec={`color: var(--accent-${k})`} scope={`hint.${k}`} className={`dt--hint-${k}`}>Hinweis-Text {k}</TypeRow>
        ))}
      </Group2>
      <Group2 title="Überschriften — font-display" scope="heading">
        {HEADINGS.map(([k, sample, spec]) => (
          <TypeRow key={k} label={k} spec={spec} scope={`heading.${k}`} className={`dt--${k}`}>{sample}</TypeRow>
        ))}
      </Group2>
      <Group2 title="Text-Hierarchie — Anwendung (// Slot, /// Inline)" scope="hierarchy">
        {HIERARCHY.map(([k, label, sample, spec, cls]) => (
          <TypeRow key={k} label={label} spec={spec} scope={`hierarchy.${k}`} className={cls}>{sample}</TypeRow>
        ))}
        <p className="dt-type__note">Regel: Heading nie kleiner als Body; rem-relational; // = Slot, /// = Inline.</p>
      </Group2>
    </div>
  ),
}
