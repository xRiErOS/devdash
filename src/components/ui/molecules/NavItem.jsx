import Badge from '../atoms/Badge.jsx'

/**
 * NavItem — Molecule (04.20 Navigation, GF-232). Eine Navigations-Zeile:
 * optionales Icon + Label + optionaler Count-Badge, gerendert als Link (href)
 * oder Button (onClick). Folgt der TabButton-Präzedenz (Molecule rendert ihr
 * eigenes interaktives Root-Element + komponiert Badge + nimmt das Icon als Node).
 *
 * Dumb-Molecule (CONV-molecule-boundary): präsentational, KEIN Routing-/Active-
 * State-Management — `active` ist ein Prop, das der konsumierende Organismus
 * (Sidebar/NavRail) aus der Route ableitet. Token-clean, logische RTL-Utilities.
 *
 * @param {object} props
 * @param {string} [props.href] - gesetzt → <a>; aktiv markiert via aria-current.
 * @param {()=>void} [props.onClick] - ohne href → <button>.
 * @param {import('react').ReactNode} [props.icon] - führendes Icon (Node).
 * @param {number} [props.count] - optionaler Count → Badge (nur bei typeof number).
 * @param {boolean} [props.active=false] - markiert die aktive Zeile.
 * @param {boolean} [props.disabled=false] - nur im Button-Modus wirksam.
 * @param {import('react').ReactNode} [props.children] - Label.
 * @param {string} [props.className]
 */

const BASE =
  'inline-flex items-center gap-2 w-full rounded-lg px-3 py-2 text-[13px] text-start no-underline transition-colors duration-[var(--duration-fast)] ease-standard'
const STATE = {
  active: 'bg-[var(--surface1)] text-[var(--text)] font-semibold',
  inactive: 'text-[var(--subtext0)] font-medium hover:bg-[var(--surface0)] hover:text-[var(--text)]',
}

// iconOnly (NavRail): 44px-Quadrat, zentriert, Label nur als aria. Count als
// Eck-Overlay statt inline.
const ICON_BASE =
  'relative inline-flex items-center justify-center w-11 h-11 rounded-lg no-underline transition-colors duration-[var(--duration-fast)] ease-standard'

export default function NavItem({
  href,
  onClick,
  icon,
  count,
  active = false,
  disabled = false,
  iconOnly = false,
  label,
  children,
  className = '',
  ...rest
}) {
  const stateClasses = active ? STATE.active : STATE.inactive
  const base = iconOnly ? ICON_BASE : BASE
  const cls = `${base} ${stateClasses} ${className}`
  // Count bleibt neutral (Badge-Default). Ein Akzent-Override per className verlor
  // bei gleicher Tailwind-Spezifität unzuverlässig (B03) → bewusst weggelassen.
  const inner = iconOnly ? (
    <>
      {icon}
      {typeof count === 'number' && (
        <Badge size="sm" data-ui="nav-item.count" className="absolute -top-1 -end-1 px-1 py-0">
          {count}
        </Badge>
      )}
    </>
  ) : (
    <>
      {icon}
      <span className="truncate">{children}</span>
      {typeof count === 'number' && (
        <Badge size="sm" data-ui="nav-item.count" className="ms-auto">
          {count}
        </Badge>
      )}
    </>
  )
  // iconOnly trägt das Label nur als aria-label (Icon-only ist bedeutungstragend).
  const ariaLabel = iconOnly ? (label || (typeof children === 'string' ? children : undefined)) : undefined

  if (href) {
    return (
      <a
        href={href}
        data-ui="nav-item"
        aria-current={active ? 'page' : undefined}
        aria-label={ariaLabel}
        title={iconOnly ? ariaLabel : undefined}
        className={cls}
        {...rest}
      >
        {inner}
      </a>
    )
  }
  return (
    <button
      type="button"
      data-ui="nav-item"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      aria-label={ariaLabel}
      title={iconOnly ? ariaLabel : undefined}
      className={`${cls} bg-transparent border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      {...rest}
    >
      {inner}
    </button>
  )
}
