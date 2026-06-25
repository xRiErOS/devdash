import React from 'react'

// DD-279 (M3-S01 T02): Sessions-Slot-Placeholder. Wird in M4 durch echte
// SessionsPanel-Komponente ersetzt (siehe slots/index.js Registry).

export default function SessionsSlotPlaceholder({ projectId, projectSlug }) {
  return (
    <div
      className="slot-placeholder slot-placeholder-sessions"
      data-ui="project-home.bottom-slot.sessions"
      data-slot="sessions"
      data-project-id={projectId}
      data-project-slug={projectSlug}
      role="region"
      aria-label="Sessions-Slot — wird in M4 aktiviert"
    >
      <div className="slot-icon" aria-hidden="true">⌛</div>
      <div className="slot-body">
        <div className="slot-title">Sessions</div>
        <div className="slot-meta">Coming in M4 · Claude Code Sessions Live-View</div>
      </div>
    </div>
  )
}
