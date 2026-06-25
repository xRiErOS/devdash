// DD-279 (M3-S01 T02): Slot-API Vertrag — U01 aus Roadmap-Spec.
// JSDoc-Types statt TypeScript (Repo hat kein tsconfig.json — JSDoc ist idiomatisch).
//
// @stable — Änderungen nur via D-Code-Decision in M4/M5-Spec. Lock-Datum 2026-05-24.
//
// M3 registriert 2 Slots: sessions (M4), terminal (M5). Beide rendern in M3 nur
// Placeholder-Komponenten. M4/M5 ersetzen die Component-Referenz in der Registry —
// kein Refactor an ProjectHomeView oder SlotsContainer notwendig.

/**
 * Props die jeder Slot-Component erhält.
 *
 * @typedef {Object} SlotProps
 * @property {number} projectId          Aktive Projekt-ID
 * @property {string} projectSlug        Slug aus projects-Tabelle (z.B. "devd")
 * @property {boolean} [collapsed]       Bottom-Slot eingeklappt? Default false.
 * @property {(height: number) => void} [onResize]  Slot meldet seine Höhe an Container.
 */

/**
 * Registry-Eintrag im slotRegistry-Array.
 *
 * @typedef {Object} ProjectHomeSlot
 * @property {'sessions' | 'terminal'} slotName    Fixer Slot-Name. Erweiterung nur via M-Decision.
 * @property {import('react').ComponentType<SlotProps>} Component  Slot-Komponente (M3: Placeholder, M4/M5: echte Implementierung).
 * @property {boolean} enabled                     Feature-Flag. false → nicht im Container gerendert.
 * @property {boolean} mobile                      Render auch im Mobile-Breakpoint (<768px)? M3: false (Spec 2.3).
 * @property {1 | 2} order                         Reihenfolge im Bottom-Slot-Container. 1 = links, 2 = rechts.
 */

/**
 * Verfügbare Slot-Namen — als Lookup-Konstante exportiert für Lifecycle-Validation.
 *
 * @type {readonly ['sessions', 'terminal']}
 */
export const SLOT_NAMES = Object.freeze(['sessions', 'terminal'])

/**
 * Pflichtfelder im Registry-Eintrag. Konsumenten (Tests, SlotsContainer) validieren
 * gegen diese Liste.
 *
 * @type {readonly ['slotName', 'Component', 'enabled', 'mobile', 'order']}
 */
export const SLOT_REQUIRED_FIELDS = Object.freeze([
  'slotName',
  'Component',
  'enabled',
  'mobile',
  'order',
])
