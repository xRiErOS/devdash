/**
 * Badge — Basis-Atom (PO 2026-06-16, D-pill-badge-taxonomy). Farbcodierter
 * Label-Chip (rounded-full) auf der direkten Catppuccin-Tone-Achse. Generisch:
 * trägt KEINE Status-/Domänen-Semantik — das ist die Variante StatusBadge.
 * Abgrenzung zu Pill: Pill = semantische Akzent-Achse (primary/success/…),
 * Badge = direkte Palette-Tones (für Status-Codierung). Props-driven.
 *
 * @param {object} props
 * @param {'yellow'|'blue'|'lavender'|'peach'|'mauve'|'green'|'red'|'teal'|'sapphire'|'neutral'} [props.tone='neutral']
 * @param {'solid'|'tint'} [props.appearance='solid'] - Farb-Treatment: `solid` (gefüllter
 *   Tone, rounded-full, Default, unverändert) | `tint` (Terminal-V2 analog Button GF-337:
 *   ton-getönter BG color-mix ~16% + Rand ~34% + Text im vollen Ton, scharfe Kante rounded-sm).
 * @param {'sm'|'md'} [props.size='md']
 * @param {import('react').ReactNode} [props.children]
 * @param {string} [props.className]
 */

// Statische Tailwind-arbitrary-Klassen je Tone (JIT-Scanner sieht Literale).
const TONE = {
  yellow: 'bg-[var(--yellow)] text-[var(--on-accent)]',
  blue: 'bg-[var(--blue)] text-[var(--on-accent)]',
  lavender: 'bg-[var(--lavender)] text-[var(--on-accent)]',
  peach: 'bg-[var(--peach)] text-[var(--on-accent)]',
  mauve: 'bg-[var(--mauve)] text-[var(--on-accent)]',
  green: 'bg-[var(--green)] text-[var(--on-accent)]',
  red: 'bg-[var(--red)] text-[var(--on-accent)]',
  teal: 'bg-[var(--teal)] text-[var(--on-accent)]',
  sapphire: 'bg-[var(--sapphire)] text-[var(--on-accent)]',
  neutral: 'bg-[var(--overlay0)] text-[var(--on-accent)]',
}

// Terminal-V2-Treatment je Tone (GF-337-Sprache): ton-getönter BG + Rand, Text im vollen Ton.
const TINT = {
  yellow: 'bg-[color-mix(in_oklab,var(--yellow)_16%,transparent)] border border-[color-mix(in_oklab,var(--yellow)_34%,transparent)] text-[var(--yellow)]',
  blue: 'bg-[color-mix(in_oklab,var(--blue)_16%,transparent)] border border-[color-mix(in_oklab,var(--blue)_34%,transparent)] text-[var(--blue)]',
  lavender: 'bg-[color-mix(in_oklab,var(--lavender)_16%,transparent)] border border-[color-mix(in_oklab,var(--lavender)_34%,transparent)] text-[var(--lavender)]',
  peach: 'bg-[color-mix(in_oklab,var(--peach)_16%,transparent)] border border-[color-mix(in_oklab,var(--peach)_34%,transparent)] text-[var(--peach)]',
  mauve: 'bg-[color-mix(in_oklab,var(--mauve)_16%,transparent)] border border-[color-mix(in_oklab,var(--mauve)_34%,transparent)] text-[var(--mauve)]',
  green: 'bg-[color-mix(in_oklab,var(--green)_16%,transparent)] border border-[color-mix(in_oklab,var(--green)_34%,transparent)] text-[var(--green)]',
  red: 'bg-[color-mix(in_oklab,var(--red)_16%,transparent)] border border-[color-mix(in_oklab,var(--red)_34%,transparent)] text-[var(--red)]',
  teal: 'bg-[color-mix(in_oklab,var(--teal)_16%,transparent)] border border-[color-mix(in_oklab,var(--teal)_34%,transparent)] text-[var(--teal)]',
  sapphire: 'bg-[color-mix(in_oklab,var(--sapphire)_16%,transparent)] border border-[color-mix(in_oklab,var(--sapphire)_34%,transparent)] text-[var(--sapphire)]',
  neutral: 'bg-[var(--surface0)] border border-[var(--surface2)] text-[var(--subtext0)]',
}

const APPEARANCE = { solid: TONE, tint: TINT }
// appearance → Form: solid = Chip (rounded-full); tint = scharf (rounded-sm, Terminal).
const RADIUS = { solid: 'rounded-full', tint: 'rounded-sm' }

const SIZE = {
  sm: 'text-[11px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
}

export default function Badge({ tone = 'neutral', appearance = 'solid', size = 'md', children, className = '', ...rest }) {
  const map = APPEARANCE[appearance] || TONE
  const toneClasses = map[tone] || map.neutral
  const radius = RADIUS[appearance] || RADIUS.solid
  const sizeClasses = SIZE[size] || SIZE.md
  return (
    <span
      data-ui="badge"
      className={`inline-flex items-center font-medium ${radius} ${sizeClasses} ${toneClasses} ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
