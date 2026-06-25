/**
 * OptIcon — kanonisches, token-sauberes Option-Icon (DD-56 Harvest aus AddLinkPicker).
 * Farbiges Lucide-Dispatch: rendert je Option ein passendes SVG-Glyph in der zugehörigen
 * Akzentfarbe. Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {'spec'|'issue'|'vault'|'url'} props.option - Welches Glyph + welche Farbe
 * @param {number} [props.size=14] - Kantenlänge in px (quadratisch)
 * @param {string} [props.className] - zusätzliche Klassen
 */

// Statische Tailwind-arbitrary-Klassen je Option. Literal, damit der Tailwind-JIT-Scanner
// die Werte sieht (keine String-Interpolation im Token). text-* steuert die SVG-Farbe via
// stroke="currentColor".
const COLOR_MAP = {
  spec: 'text-[var(--accent-warning)]',
  issue: 'text-[var(--accent-info)]',
  vault: 'text-[var(--accent-primary)]',
  url: 'text-[var(--accent-success)]',
}

// SVG-Pfade je Option (Lucide-Stil, viewBox 0 0 24 24).
const GLYPH_MAP = {
  spec: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  issue: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  vault: (
    <>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  url: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>
  ),
}

export default function OptIcon({ option, size = 14, className = '' }) {
  const colorClass = COLOR_MAP[option] || 'text-[var(--text)]'

  return (
    <svg
      data-ui="opt-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${colorClass} ${className}`}
    >
      {GLYPH_MAP[option] || null}
    </svg>
  )
}
