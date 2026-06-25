import { ChevronRight } from 'lucide-react'
import Link from '../atoms/Link.jsx'

/**
 * BreadcrumbItem — Molecule (04.20 Navigation, GF-234). Ein Breadcrumb-Segment:
 * optionales führendes Icon + Label als Link (`href`) bzw. als aktuelles Segment
 * (`current` → nicht-verlinkter Text mit aria-current), plus ein Separator-Icon
 * (Chevron) nach dem Segment — außer beim letzten (`isLast`).
 *
 * Dumb-Molecule (CONV-molecule-boundary): präsentational, kein Routing-State.
 * Komponiert das `Link`-Atom; der Separator ist ein dekoratives Icon. Token-clean.
 *
 * @param {object} props
 * @param {string} [props.href] - Ziel (nicht-aktuelles Segment).
 * @param {boolean} [props.current=false] - aktuelles Segment → Text statt Link, aria-current.
 * @param {boolean} [props.isLast=false] - letztes Segment → kein Separator.
 * @param {import('react').ReactNode} [props.icon] - optionales führendes Icon (Node).
 * @param {import('react').ReactNode} [props.children] - Label.
 * @param {string} [props.className]
 */
export default function BreadcrumbItem({
  href,
  current = false,
  isLast = false,
  icon,
  children,
  className = '',
  ...rest
}) {
  const segment = current ? (
    <span
      data-ui="breadcrumb-item.current"
      aria-current="page"
      className="inline-flex items-center gap-1 text-[var(--text)] font-medium"
    >
      {icon}
      {children}
    </span>
  ) : (
    // variant="default" (Akzent-Info) statt muted: nicht-aktuelle Segmente sind
    // klar als Link erkennbar (E01, PO 2026-06-16). Aktuelles Segment bleibt
    // neutraler Text (current-Zweig oben).
    <Link href={href} variant="default" data-ui="breadcrumb-item.link">
      {icon}
      {children}
    </Link>
  )

  return (
    <span data-ui="breadcrumb-item" className={`inline-flex items-center gap-1 ${className}`} {...rest}>
      {segment}
      {!isLast && (
        <ChevronRight
          size={14}
          aria-hidden="true"
          data-ui="breadcrumb-item.separator"
          className="shrink-0 text-[var(--subtext0)]"
        />
      )}
    </span>
  )
}
