import React from 'react'
import { IssueCard } from './primitives.jsx'

// Plan 04 T01 (D09): einklappbare „Storniert"-Sektion als wiederverwendbares
// Organism. Props-rein. `variant` steuert nur das Outer-Layout:
//   - 'column' → flache Sprint-Row: eigene 22rem-Spalte (flex-shrink-0).
//   - 'row'    → Swimlane-Modus: volle Breite unterhalb der Buckets (mt-4).
// Rendert null, solange keine stornierten Items vorliegen.
const VARIANT_CLASS = {
  column: 'flex-shrink-0 w-[22rem] rounded-xl p-4',
  row: 'mt-4 rounded-xl p-4',
}

// DD-351: data-ui-Slug pro Variante (Debug-Mode Hover-Inspect). Swimlane-Reihe
// und flache Spalte tragen historisch unterschiedliche Slugs.
const VARIANT_UI = {
  column: 'sprint-board.cancelled-column',
  row: 'sprint-board.cancelled',
}

export default function CancelledColumn({ items, show, onToggle, onSelect, onToggleMulti, selectedIds, variant = 'column' }) {
  if (!items || items.length === 0) return null
  const uiBase = VARIANT_UI[variant] || VARIANT_UI.column
  return (
    <div className={VARIANT_CLASS[variant] || VARIANT_CLASS.column} style={{ background: 'var(--mantle)', opacity: 0.75 }} data-ui={uiBase}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm" style={{ color: 'var(--subtext0)' }}>
          Storniert ({items.length})
        </h3>
        <button
          onClick={onToggle}
          data-ui={`${uiBase}.toggle`}
          className="text-xs px-2 py-1 rounded"
          style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
        >
          {show ? 'Einklappen' : 'Anzeigen'}
        </button>
      </div>
      {show && items.map(item => (
        <IssueCard key={item.id} item={item} onSelect={onSelect} onToggleMulti={onToggleMulti} multiSelected={selectedIds.has(item.id)} />
      ))}
    </div>
  )
}
