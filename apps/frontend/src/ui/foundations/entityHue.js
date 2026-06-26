/**
 * entityHue — Entitäts-Art → Catppuccin-Ton für die farbcodierte Entity-ID.
 *
 * Kernidee (PO 2026-06-25): IDs werden je Entität mit eigener Farbe dargestellt,
 * KEIN Hintergrund — nur die Farbe trägt die Entität. Reiner Präsentations-Mapper.
 *
 * issue → sapphire · sprint → peach · milestone → mauve.
 *
 * Bekannte Kollision mit statusTone (sprint=peach=in_progress, milestone=mauve=
 * to_review): akzeptabel, weil die Kontexte getrennt sind (Entity-ID-Pill vs.
 * StatusDot). Siehe Plan „Verbleibende Klein-Entscheidungen".
 *
 * Tailwind-v4-Hinweis wie statusTone.js: Werte sind literale Utility-Strings.
 *
 * @param {'issue'|'sprint'|'milestone'} kind
 * @returns {string} Text-Farb-Utility
 */
export const ENTITY_HUE = {
  issue: 'text-[var(--sapphire)]',
  sprint: 'text-[var(--peach)]',
  milestone: 'text-[var(--mauve)]',
}

export function entityHue(kind) {
  return ENTITY_HUE[kind] || 'text-[var(--subtext0)]'
}
