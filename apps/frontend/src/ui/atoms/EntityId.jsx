/**
 * EntityId — farbcodierte Entitäts-ID (Issue/Sprint/Milestone), KEIN Hintergrund.
 *
 * Kernidee (PO 2026-06-25): die Farbe trägt die Entität — `DD2-7` (sapphire,
 * Issue), `DD#49` (peach, Sprint), `M3` (mauve, Milestone). Reines Display-Atom,
 * props-driven, kein Store/Fetch. Größe erbt vom Kontext (Tree 11px ↔ Title 20px),
 * darum keine fixe font-size — nur Farbe (entityHue), Display-Font und Gewicht.
 *
 * @param {object} props
 * @param {'issue'|'sprint'|'milestone'} props.kind - bestimmt die Farbe (entityHue)
 * @param {string} [props.tone] - expliziter Catppuccin-Ton (z.B. 'peach'), der die
 *   kind-Hue überschreibt — für Nicht-Entity-IDs (z.B. Projekt-Slug im PageTitle).
 *   Wenn gesetzt, wird `entityHue` NICHT emittiert (kein Tailwind-Klassen-Konflikt).
 * @param {React.ReactNode} props.children - der ID-Text (z.B. "DD2-7")
 * @param {string} [props.dataUiScope='entityId'] - data-ui-Namensraum (Ketten-Prefix)
 * @param {string} [props.className]
 */
import { entityHue } from '../foundations/entityHue.js'

// Literale Klassen (Tailwind-v4-JIT scannt nur statische Strings — kein Template).
const TONE = {
  peach: 'text-[var(--peach)]',
  mauve: 'text-[var(--mauve)]',
  sapphire: 'text-[var(--sapphire)]',
  subtext0: 'text-[var(--subtext0)]',
}

export default function EntityId({ kind, tone, children, dataUiScope = 'entityId', className = '', ...rest }) {
  const hue = tone ? (TONE[tone] || entityHue(kind)) : entityHue(kind)
  return (
    <span
      data-ui={dataUiScope}
      className={`[font-family:var(--font-display)] font-semibold ${hue} ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
