/**
 * ProgressDots — Molecule (DD-698, ex-Atom DD-481). Token-saubere Status-Fortschrittsanzeige als
 * verbundene Punkte (Stepper): jeder Lifecycle-Schritt ist ein Dot, die Dots
 * sind durch eine Linie verbunden; erreichte Schritte (bis inkl. aktuellem)
 * färben sich ein, der aktuelle Schritt trägt einen Ring, künftige bleiben
 * gedämpft. Generisch über drei Varianten (issue/sprint/milestone) und zwei
 * Orientierungen (horizontal/vertical). Props-driven, kein Store/Fetch, keine
 * Domänen-Logik — die Default-Schritt-Sets sind reine Beschriftungs-Tabellen.
 *
 * Der Connector zwischen zwei Dots ist „erreicht" (Akzent), wenn der spätere
 * der beiden Schritte erreicht ist. Off-Path-Status (z.B. rejected/cancelled),
 * die nicht im Schritt-Set vorkommen, ergeben currentIndex=-1 → nichts erreicht;
 * der Konsument kann ein eigenes `steps`-Set inkl. solcher Schritte reichen.
 *
 * @param {object} props
 * @param {'issue'|'sprint'|'milestone'} [props.variant='issue'] - Default-Schritt-Set
 * @param {Array<{key:string,label:string}>} [props.steps] - explizites Schritt-Set
 *        (überschreibt das Varianten-Default)
 * @param {string} props.current - Schlüssel des aktuellen Status
 * @param {'horizontal'|'vertical'} [props.orientation='horizontal']
 * @param {'sm'|'md'} [props.size='md'] - Dot-Größe
 * @param {boolean} [props.showLabels=true] - Beschriftungen anzeigen
 * @param {string} [props.dataUiScope='progress-dots'] - Wurzel-data-ui-bereich
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { Fragment } from 'react'

const STEP_SETS = {
  issue: [
    { key: 'new', label: 'Neu' },
    { key: 'refined', label: 'Refined' },
    { key: 'planned', label: 'Geplant' },
    { key: 'in_progress', label: 'In Arbeit' },
    { key: 'to_review', label: 'Review' },
    { key: 'done', label: 'Done' },
  ],
  sprint: [
    { key: 'planning', label: 'Planung' },
    { key: 'active', label: 'Aktiv' },
    { key: 'review', label: 'Review' },
    { key: 'completed', label: 'Abgeschlossen' },
  ],
  milestone: [
    { key: 'planned', label: 'Geplant' },
    { key: 'in_progress', label: 'In Arbeit' },
    { key: 'completed', label: 'Abgeschlossen' },
  ],
}

// Dot-Größen je size (statische Klassen für JIT).
const DOT = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
}
// Ring-Offset des aktuellen Dots.
const RING = 'ring-2 ring-offset-2 ring-offset-[var(--base)] ring-[var(--accent-primary)]'

// Erreicht/Aktuell/Künftig → Fill-Klassen (statisch, JIT-sichtbar).
const FILL_REACHED = 'bg-[var(--accent-primary)]'
const FILL_FUTURE = 'bg-[var(--surface1)] border border-[var(--surface2)]'
const LINE_REACHED = 'bg-[var(--accent-primary)]'
const LINE_FUTURE = 'bg-[var(--surface1)]'

export default function ProgressDots({
  variant = 'issue',
  steps,
  current,
  orientation = 'horizontal',
  size = 'md',
  showLabels = true,
  dataUiScope = 'progress-dots',
  className = '',
}) {
  const items = Array.isArray(steps) && steps.length > 0 ? steps : STEP_SETS[variant] || STEP_SETS.issue
  const currentIndex = items.findIndex((s) => s.key === current)
  const dotSize = DOT[size] || DOT.md
  const vertical = orientation === 'vertical'

  const currentLabel = currentIndex >= 0 ? items[currentIndex].label : current
  const ariaLabel = `Fortschritt: ${currentLabel} (Schritt ${currentIndex + 1} von ${items.length})`

  const labelColor = (reached, isCurrent) =>
    isCurrent ? 'font-bold text-[var(--text)]' : reached ? 'text-[var(--subtext0)]' : 'text-[var(--overlay0)]'

  // HORIZONTAL: Dots sind shrink-0, die Verbindungslinien sind flex-1-Lücken
  // dazwischen → erste Dot linksbündig, letzte rechtsbündig, IMMER volle Breite,
  // unabhängig von der Dot-Anzahl (PO 2026-06-16). Labels absolut unter den Dots
  // zentriert, ohne die Track-Breite zu beeinflussen.
  if (!vertical) {
    return (
      <ol
        data-ui={dataUiScope}
        aria-label={ariaLabel}
        className={`relative flex w-full items-center list-none m-0 p-0 ${showLabels ? 'pb-5' : ''} ${className}`}
      >
        {items.map((step, i) => {
          const reached = currentIndex >= 0 && i <= currentIndex
          const isCurrent = i === currentIndex
          return (
            <Fragment key={step.key}>
              {i > 0 && (
                <span aria-hidden="true" className={`flex-1 h-0.5 ${reached ? LINE_REACHED : LINE_FUTURE}`} />
              )}
              <li
                data-ui={`${dataUiScope}.step.${step.key}`}
                data-reached={reached ? 'true' : 'false'}
                aria-current={isCurrent ? 'step' : undefined}
                className="relative shrink-0 flex items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={`relative z-10 rounded-full ${dotSize} ${reached ? FILL_REACHED : FILL_FUTURE} ${isCurrent ? RING : ''}`}
                />
                {showLabels && (
                  <span className={`pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] leading-tight text-center ${labelColor(reached, isCurrent)}`}>
                    {step.label}
                  </span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    )
  }

  // VERTICAL: spiegelt die horizontale Logik — Dots shrink-0, Linien als flex-1-
  // Lücken dazwischen → erste Dot oben, letzte unten, IMMER gleiche Gesamthöhe
  // (füllt h-full des Eltern-Elements), unabhängig von der Dot-Anzahl. Labels
  // rechts neben den Dots.
  return (
    <ol data-ui={dataUiScope} aria-label={ariaLabel} className={`flex flex-col h-full items-start list-none m-0 p-0 ${className}`}>
      {items.map((step, i) => {
        const reached = currentIndex >= 0 && i <= currentIndex
        const isCurrent = i === currentIndex
        return (
          <Fragment key={step.key}>
            {i > 0 && (
              <span aria-hidden="true" className={`w-0.5 flex-1 ms-[6px] shrink-0 ${reached ? LINE_REACHED : LINE_FUTURE}`} />
            )}
            <li
              data-ui={`${dataUiScope}.step.${step.key}`}
              data-reached={reached ? 'true' : 'false'}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative shrink-0 flex flex-row items-center gap-3"
            >
              <span
                aria-hidden="true"
                className={`relative z-10 shrink-0 rounded-full ${dotSize} ${reached ? FILL_REACHED : FILL_FUTURE} ${isCurrent ? RING : ''}`}
              />
              {showLabels && (
                <span className={`text-left text-[10px] leading-tight ${labelColor(reached, isCurrent)}`}>
                  {step.label}
                </span>
              )}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
