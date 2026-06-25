/**
 * Card / Panel — kanonische, token-saubere Variante (DD-56 Harvest).
 * Geschachtelte Flächen-Hierarchie (Pattern P08).
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {'crust'|'mantle'|'base'|'surface0'|'surface1'|'surface2'|'transparent'} [props.tone='base'] - Hintergrund-Ebene (Surface-Elevation-Canon 01.15; transparent = Widget-Root, kein Fill)
 * @param {boolean} [props.bordered=true] - 1px Token-Border
 * @param {'none'|'sm'|'md'} [props.padding='md'] - Innenabstand
 * @param {import('react').ReactNode} [props.children] - Inhalt
 * @param {string} [props.className] - zusätzliche Klassen
 */

// Tailwind-arbitrary-Klassen je tone. Statisch, damit der Tailwind-JIT-Scanner
// die Werte literal sieht (keine String-Interpolation im Token).
// GF-420: Surface-Elevation-Canon (01.15 D02) — Card = kanonischer Sprossen-
// Mechanismus. surface1 = Widget-Child (Feld-in-Card, D01); surface2 = Child-im-
// Child / 4. statischer Rang bei echter Dichte (D03). Statische Tiefe endet bei 4.
const TONE_MAP = {
  crust: 'bg-[var(--crust)]',
  mantle: 'bg-[var(--mantle)]',
  base: 'bg-[var(--base)]',
  surface0: 'bg-[var(--surface0)]',
  surface1: 'bg-[var(--surface1)]',
  surface2: 'bg-[var(--surface2)]',
  // GF-421: Widget-Root erbt die Eltern-Fläche (surface0-Akkordeon), kein eigener
  // Fill (01.15 D01). Border bleibt sichtbar (border-driven Terminal-Sprache).
  transparent: 'bg-transparent',
}

// DD-636 (F4): Padding liest die manuellen --space-*-Tokens → responsiver Mobile-
// Density-Override (index.css) ohne per-Komponenten-Anpassung. Desktop unverändert
// (--space-2=8 == p-2, --space-4=16 == p-4).
const PADDING_MAP = {
  none: '',
  sm: 'p-[var(--space-2)]',
  md: 'p-[var(--space-4)]',
}

export default function Card({
  tone = 'base',
  bordered = true,
  padding = 'md',
  children,
  className = '',
  ...rest
}) {
  const toneClasses = TONE_MAP[tone] || TONE_MAP.base
  const padClasses = PADDING_MAP[padding] ?? PADDING_MAP.md
  // GF-215: --border = subtile Kontrast-Linie, sichtbar auf JEDER Surface (behebt
  // den Surface0-Border-auf-Surface0-Tone-Kollaps; PO 2026-06-15).
  const borderClasses = bordered ? 'border border-[var(--border)]' : ''

  return (
    <div
      data-ui="card"
      className={`rounded-lg ${padClasses} ${borderClasses} ${toneClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
