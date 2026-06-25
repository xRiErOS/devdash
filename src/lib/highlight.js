// DD-34: Volltext-Highlight-Helper.
// Zerlegt einen Text in Plain-Strings + match-Strings basierend auf einer Query.
// Gibt React-Nodes zurueck (Plain-Text + <mark>-Tags fuer Treffer).

import React from 'react'

// Regex-Sonderzeichen escapen, damit Suchbegriff nicht als Pattern interpretiert wird.
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * highlight(text, query) — gibt Array von React-Nodes zurueck.
 * Bei leerer Query oder Text: nur Original-Text.
 *
 * Verwendung:
 *   <span>{highlight(item.title, search)}</span>
 *
 * Catppuccin-Styling: <mark> nutzt --yellow @ 30% Hintergrund.
 * Kein Re-Render-Loop: rein synchron, O(n) ueber Splits.
 */
export function highlight(text, query) {
  const safe = String(text ?? '')
  const q = String(query ?? '').trim()
  if (!safe || !q) return safe
  try {
    const re = new RegExp(`(${escapeRegex(q)})`, 'gi')
    const parts = safe.split(re)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return React.createElement(
          'mark',
          {
            key: i,
            style: {
              background: 'color-mix(in srgb, var(--yellow) 32%, transparent)',
              color: 'var(--text)',
              borderRadius: '2px',
              padding: '0 2px',
            },
          },
          part
        )
      }
      return part
    })
  } catch {
    return safe
  }
}
