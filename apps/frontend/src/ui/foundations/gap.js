// src/components/ui/layout/gap.js
// DD-636 (F4): Gaps lesen die manuellen --space-*-Tokens (NICHT Tailwinds --spacing-
// Multiplikator) → fließen durch den Mobile-Density-Override in index.css und schrumpfen
// systemweit auf kleinen Viewports, ohne Touch-Target-Utilities (h-11/w-11) zu berühren.
// Desktop-Werte unverändert: --space-1=4 / -2=8 / -4=16 / -6=24 (== alte gap-1/2/4/6).
const MAP = { none: 'gap-0', xs: 'gap-[var(--space-1)]', sm: 'gap-[var(--space-2)]', md: 'gap-[var(--space-4)]', lg: 'gap-[var(--space-6)]' }
export function gapClass(gap) {
  return MAP[gap] || MAP.md
}
