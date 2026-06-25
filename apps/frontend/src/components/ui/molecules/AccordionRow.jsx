import { ChevronDown } from 'lucide-react'

/**
 * AccordionRow — Molecule (04.40 Data Display, GF-240 / ML-15). Eine Disclosure-
 * Zeile: Trigger-Button (optionales Lead-Icon + Titel + Chevron) + ein Panel-Slot,
 * der nur bei `open` rendert. Komponiert von OR-22 (Children-Accordion).
 *
 * Dumb-Molecule (CONV-molecule-boundary): controlled — `open` ist Prop, `onToggle`
 * der Callback (der Consumer/Organismus besitzt den State). Lokaler Disclosure-
 * State wäre per D04 erlaubt, hier aber bewusst controlled für OR-22-Komposition.
 *
 * @param {object} props
 * @param {boolean} [props.open=false] - aufgeklappt → Panel sichtbar, Chevron gedreht.
 * @param {() => void} [props.onToggle] - Klick-Callback des Triggers.
 * @param {import('react').ReactNode} props.title - Trigger-Label.
 * @param {() => void} [props.onTitleActivate] - gesetzt → Split-Modus (GF-296): der Titel
 *   wird ein eigener Klick-Bereich (Navigation, `accordion-row.title`), und NUR das Chevron
 *   toggelt das Panel (`accordion-row.trigger`). Ohne → ganze Zeile toggelt (Default).
 * @param {import('react').ReactNode} [props.icon] - optionales Lead-Icon im Trigger.
 * @param {string} [props.panelId] - id des Panels (aria-controls/region).
 * @param {boolean} [props.disabled=false]
 * @param {import('react').ReactNode} [props.children] - Panel-Inhalt (nur bei open).
 * @param {string} [props.className]
 */
export default function AccordionRow({
  open = false,
  onToggle,
  title,
  onTitleActivate,
  icon,
  panelId,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const splitNav = typeof onTitleActivate === 'function'
  const chevron = (
    <ChevronDown
      size={16}
      aria-hidden="true"
      className={`shrink-0 text-[var(--subtext0)] transition-transform${open ? ' rotate-180' : ''}`}
    />
  )
  const panel = open && (
    <div
      data-ui="accordion-row.panel"
      id={panelId}
      role="region"
      className="pb-3 ps-1 pe-1 text-sm text-[var(--subtext1)]"
    >
      {children}
    </div>
  )

  return (
    <div
      data-ui="accordion-row"
      className={`border-b border-[var(--surface1)] ${className}`}
      {...rest}
    >
      {splitNav ? (
        // Split-Modus: Titel navigiert, Chevron toggelt (GF-296).
        <div className="flex w-full items-center gap-2 py-3 ps-1 pe-1 text-sm text-[var(--text)]">
          {icon && <span data-ui="accordion-row.icon" className="shrink-0 inline-flex">{icon}</span>}
          <button
            type="button"
            data-ui="accordion-row.title"
            onClick={onTitleActivate}
            disabled={disabled}
            className="min-w-0 flex-1 truncate text-start font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {title}
          </button>
          <button
            type="button"
            data-ui="accordion-row.trigger"
            onClick={onToggle}
            disabled={disabled}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? 'Einklappen' : 'Aufklappen'}
            className="shrink-0 inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-ui="accordion-row.trigger"
          onClick={onToggle}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-2 py-3 ps-1 pe-1 text-start text-sm text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {icon && <span data-ui="accordion-row.icon" className="shrink-0 inline-flex">{icon}</span>}
          <span data-ui="accordion-row.title" className="min-w-0 flex-1 truncate font-medium">{title}</span>
          {chevron}
        </button>
      )}
      {panel}
    </div>
  )
}
