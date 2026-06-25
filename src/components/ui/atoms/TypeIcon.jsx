/**
 * TypeIcon — kanonisches Harvest aus projectHome/TodoLinksList.jsx (DD-56).
 * Lucide-Dispatch nach Link-Typ (spec/issue/vault/url) mit typ-gebundener Akzentfarbe.
 * Props-driven, kein Store/Fetch, kein Bezug zu Todo-/Issue-State.
 *
 * HINWEIS: bewusst GETRENNT von `typeIcons` (Issue-Typ-Mapping) — nicht mergen.
 *
 * @param {object} props
 * @param {'spec'|'issue'|'vault'|'url'|string} props.type - Link-Typ → Lucide-Icon + Farbe
 * @param {number} [props.size=14] - Kantenlänge in px
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { FileText, AlertCircle, Notebook, ExternalLink, Link2 } from 'lucide-react'

// Statische Map type → Lucide-Component. Kein String-Interpolation-Dispatch.
const ICON_MAP = {
  spec: FileText,
  issue: AlertCircle,
  vault: Notebook,
  url: ExternalLink,
}

// Statische Map type → Tailwind-Text-Token (= stroke-Farbe via currentColor).
// Spiegelt TYPE_COLORS der Quelle: spec→peach, issue→blue, vault→mauve, url→green.
const COLOR_MAP = {
  spec: 'text-[var(--accent-warning)]',
  issue: 'text-[var(--accent-info)]',
  vault: 'text-[var(--accent-primary)]',
  url: 'text-[var(--accent-success)]',
}

export default function TypeIcon({ type, size = 14, className = '' }) {
  const Icon = ICON_MAP[type] || Link2
  const colorClass = COLOR_MAP[type] || 'text-[var(--subtext1)]'

  return (
    <Icon
      data-ui="type-icon"
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      className={`shrink-0 ${colorClass} ${className}`}
    />
  )
}
