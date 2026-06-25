import Stack from '../layout/Stack.jsx'

/**
 * DetailBody — EINE Quelle der kanonischen Detail-Reihenfolge (DD-635 / F3).
 * Status-Stepper (ganz oben) → Titel → Type/Priority-Chips (unter dem Titel) →
 * Inhalt → Meta-Section als LETZTES Element. Geteilt von der Vollbild-Detailseite
 * (<1024) und dem Two-Pane-Detail (≥1024), damit beide Präsentationen exakt
 * dieselbe Reihenfolge garantieren (FSD T02; DD-595/596/608/609/610).
 *
 * Die Chips- und Meta-Anker (app-shell.detail.chips / .meta) werden hier zentral
 * emittiert — der Status-Chip entfällt bewusst (redundant zum Status-Stepper oben,
 * PO 2026-06-13); die Chip-Reihe trägt nur Type + Priority.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.statusStepper - Status-Fokus (oben)
 * @param {import('react').ReactNode} props.title - Titel-Slot (h1 / Inline-Edit)
 * @param {import('react').ReactNode} [props.chips] - Type/Priority-Chips
 * @param {import('react').ReactNode} props.children - Inhalt (Tabs / Sections)
 * @param {import('react').ReactNode} [props.meta] - Meta-Section (immer zuletzt)
 * @param {string} [props.className]
 */
export default function DetailBody({ statusStepper, title, chips, children, meta, className = '' }) {
  return (
    <Stack gap="md" className={className} data-ui="app-shell.detail.body">
      {statusStepper}
      <Stack gap="xs">
        {title}
        {chips != null && (
          <div className="flex flex-wrap items-center gap-1.5" data-ui="app-shell.detail.chips">
            {chips}
          </div>
        )}
      </Stack>
      {children}
      {meta != null && (
        <div data-ui="app-shell.detail.meta">
          {meta}
        </div>
      )}
    </Stack>
  )
}
