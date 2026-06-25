// DD-279 (M3-S01 T02): Slot-Registry — Single-Point-of-Change für M4/M5.
//
// @stable Slot-API (siehe types.js).
//
// Erweiterung um neue Slots: nur via D-Code-Decision in entsprechender Milestone-Spec.
// Component-Tausch (Placeholder → echte Implementierung): in M4/M5 erlaubt, ohne
// Änderung an SlotsContainer oder ProjectHomeView.
//
// DD-487 (B04): Beide Slots auf enabled:false gesetzt — der Sessions/Terminal-
// Bottom-Slot ist obsolet und nicht Teil der SOLL-Story (ProjectHome.stories).
// ProjectHomeView verdrahtet den bottomSlot nicht mehr. Registry-Einträge +
// SlotsContainer bleiben als stabile API erhalten (kein Delete — Konsumenten:
// SlotsContainer-Story + tests/m03-s01/t02-slot-api), nur deaktiviert.

import SessionsSlotPlaceholder from './SessionsSlotPlaceholder.jsx'
import TerminalSlotPlaceholder from './TerminalSlotPlaceholder.jsx'

/** @type {import('./types.js').ProjectHomeSlot[]} */
export const slotRegistry = [
  {
    slotName: 'sessions',
    Component: SessionsSlotPlaceholder,
    enabled: false,
    mobile: false,
    order: 1,
  },
  {
    slotName: 'terminal',
    Component: TerminalSlotPlaceholder,
    enabled: false,
    mobile: false,
    order: 2,
  },
]

export { default as SessionsSlotPlaceholder } from './SessionsSlotPlaceholder.jsx'
export { default as TerminalSlotPlaceholder } from './TerminalSlotPlaceholder.jsx'
export { default as SlotsContainer } from './SlotsContainer.jsx'
export { SLOT_NAMES, SLOT_REQUIRED_FIELDS } from './types.js'
