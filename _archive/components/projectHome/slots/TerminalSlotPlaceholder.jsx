import React from 'react'

// DD-279 (M3-S01 T02): Terminal-Slot-Placeholder. Wird in M5 durch echte
// TerminalPanel-Komponente ersetzt (siehe slots/index.js Registry).

export default function TerminalSlotPlaceholder({ projectId, projectSlug }) {
  return (
    <div
      className="slot-placeholder slot-placeholder-terminal"
      data-ui="project-home.bottom-slot.terminal"
      data-slot="terminal"
      data-project-id={projectId}
      data-project-slug={projectSlug}
      role="region"
      aria-label="Terminal-Slot — wird in M5 aktiviert"
    >
      <div className="slot-icon" aria-hidden="true">▮</div>
      <div className="slot-body">
        <div className="slot-title">Terminal</div>
        <div className="slot-meta">Coming in M5 · Eingebetteter Terminal-Emulator</div>
      </div>
    </div>
  )
}
