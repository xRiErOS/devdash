import React from 'react'
import { slotRegistry } from './index.js'

// DD-279 (M3-S01 T02): Bottom-Slot-Container — rendert alle aktivierten Slots aus
// der Registry. Filterung pro Breakpoint (mobile=true → nur Slots mit mobile:true).
//
// Slot-Order: aufsteigend nach `order`-Feld (1 = links, 2 = rechts).

export default function SlotsContainer({
  projectId,
  projectSlug,
  mobile = false,
  collapsed = false,
  onResize,
}) {
  const visible = slotRegistry
    .filter(slot => slot.enabled && (!mobile || slot.mobile))
    .sort((a, b) => a.order - b.order)

  if (visible.length === 0) return null

  return (
    <div
      className="bottom-slot-container"
      data-ui="project-home.bottom-slot"
      data-mobile={mobile ? 'true' : 'false'}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      {visible.map(slot => {
        const SlotComponent = slot.Component
        return (
          <SlotComponent
            key={slot.slotName}
            projectId={projectId}
            projectSlug={projectSlug}
            collapsed={collapsed}
            onResize={onResize}
          />
        )
      })}
    </div>
  )
}
