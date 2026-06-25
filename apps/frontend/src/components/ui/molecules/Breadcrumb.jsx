import { Fragment } from 'react'
import { ChevronRight, Home } from 'lucide-react'

/**
 * Breadcrumb — DD#61 Molecule (Harvest aus components/Breadcrumb.jsx).
 * Verlinkter Navigations-Pfad aus Items. Props-driven, kein Store/Fetch,
 * keine react-router-Kopplung — Items werden als Array übergeben. Komponiert
 * Lucide-Icons (Home/Trenner) + Link-/Current-Segmente zu einer Einheit.
 *
 * Das letzte Item — oder jedes Item ohne `href`/`onClick` — wird als nicht
 * verlinktes, aktives Segment (`aria-current="page"`) gerendert.
 *
 * @param {object} props
 * @param {Array<{label: string, href?: string, onClick?: () => void, home?: boolean, key?: string}>} props.items - Pfad-Segmente (letztes = aktuell)
 * @param {string} [props.ariaLabel='Breadcrumb'] - aria-label der nav
 * @param {string} [props.className] - zusätzliche Klassen auf der nav
 */

const LINK_CLASSES =
  'inline-flex items-center gap-1.5 px-2 py-1 rounded text-[var(--subtext0)] no-underline hover:bg-[var(--surface0)] transition'
const CURRENT_CLASSES = 'inline-flex items-center gap-1.5 px-2 py-1 text-[var(--text)] font-bold'

export default function Breadcrumb({ items = [], ariaLabel = 'Breadcrumb', className = '', ...rest }) {
  return (
    <nav
      aria-label={ariaLabel}
      data-ui="breadcrumb"
      className={`flex flex-wrap items-center gap-1 font-[var(--font-display)] text-[13px] ${className}`}
      {...rest}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1
        const isLink = !last && (item.href || item.onClick)
        const key = item.key || (last ? 'current' : `crumb-${i}`)
        const inner = (
          <>
            {item.home && <Home size={14} aria-hidden data-ui="breadcrumb.icon" />}
            {item.label}
          </>
        )

        return (
          <Fragment key={key + i}>
            {i > 0 && (
              <ChevronRight
                size={14}
                aria-hidden
                data-ui="breadcrumb.separator"
                className="text-[var(--subtext1)]"
              />
            )}
            {isLink ? (
              <a
                href={item.href || undefined}
                onClick={item.onClick}
                data-ui={`breadcrumb.item.${i}`}
                className={LINK_CLASSES}
              >
                {inner}
              </a>
            ) : (
              <span
                aria-current="page"
                data-ui={`breadcrumb.item.${i}`}
                className={CURRENT_CLASSES}
              >
                {inner}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
