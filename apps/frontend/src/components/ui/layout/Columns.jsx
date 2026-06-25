// src/components/ui/layout/Columns.jsx
import { gapClass } from './gap.js'

// GF-285 / LP-07 (PO D01, 2026-06-16) — explizite, asymmetrische Spalten-Ratios.
// Abgrenzung: Grid = symmetrisch/auto-fit (intrinsische Spaltenzahl), Sidebar =
// 2-Spalten fix+fluid; Columns = feste Anzahl mit expliziter fr-Ratio (z.B. 2fr 1fr).
// Statische grid-cols-Map (kein inline-style; Tailwind-JIT sieht die Arbitraries;
// Underscore = Space in Tailwind-v4-Arbitraries).
const COLS = {
  '1-1': 'grid-cols-[1fr_1fr]',
  '1-1-1': 'grid-cols-[1fr_1fr_1fr]',
  '1-1-1-1': 'grid-cols-[1fr_1fr_1fr_1fr]',
  '2-1': 'grid-cols-[2fr_1fr]',
  '1-2': 'grid-cols-[1fr_2fr]',
  '3-1': 'grid-cols-[3fr_1fr]',
  '1-3': 'grid-cols-[1fr_3fr]',
}

/**
 * Columns — explizites Spalten-Raster mit fester Anzahl und fr-Ratio. Für Layouts,
 * die eine bestimmte asymmetrische Aufteilung BRAUCHEN (z.B. Content 2fr / Aside 1fr),
 * die weder Grid (auto-fit, symmetrisch) noch Sidebar (genau 2, fix+fluid) liefern.
 * @param {object} props
 * @param {'1-1'|'1-1-1'|'1-1-1-1'|'2-1'|'1-2'|'3-1'|'1-3'} [props.cols='1-1'] - Spalten-Ratio
 * @param {'none'|'xs'|'sm'|'md'|'lg'} [props.gap='md']
 */
export default function Columns({ cols = '1-1', gap = 'md', className = '', children, ...rest }) {
  const c = COLS[cols] || COLS['1-1']
  return (
    <div className={`grid ${c} ${gapClass(gap)} ${className}`} {...rest}>
      {children}
    </div>
  )
}
