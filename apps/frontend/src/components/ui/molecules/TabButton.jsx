/**
 * TabButton — Molecule (DD-694, ex-Atom DD-481). Komponiert das Badge-Atom (Count)
 * + optionales Icon zu einer Tab-Schaltfläche mit aktivem Unterstrich-Styling.
 * Props-driven, kein Store/Fetch, kein Tab-Routing-State, keine Domänen-Begriffe.
 *
 * Desktop (default): horizontale Anordnung, aktiver Tab mit Border-Bottom-Akzent.
 * Mobile (mobile=true): vertikale Anordnung (Icon über Label), 44px Touch-Target,
 *   aktiver Tab nur via Farbe (kein Border-Bottom).
 *
 * @param {object} props
 * @param {boolean} [props.active=false] - markiert den Tab als aktiv
 * @param {number} [props.count] - optionaler Count-Badge (nur bei typeof number gerendert)
 * @param {import('react').ReactNode} [props.icon] - optionales Icon (z.B. SVG oder lucide-Icon)
 * @param {import('react').ReactNode} [props.children] - Label-Inhalt
 * @param {boolean} [props.mobile=false] - vertikales Mobile-Layout
 * @param {() => void} [props.onClick] - Klick-Handler
 * @param {string} [props.className] - zusätzliche Klassen
 */

import Badge from '../atoms/Badge.jsx'

// Statische Klassen-Maps, damit der Tailwind-JIT-Scanner die Werte literal sieht.
const LAYOUT = {
  desktop:
    'flex-row gap-2 px-[var(--space-4,1rem)] text-[13px] min-h-0 min-w-0',
  mobile:
    'flex-col gap-0.5 px-1.5 py-1.5 text-[11px] min-h-[44px] min-w-[44px] flex-1',
}

// Aktiv-Styling. Desktop bekommt den Border-Bottom-Akzent, mobile nur Textfarbe.
const STATE = {
  desktopActive:
    'text-[var(--text)] font-semibold border-b-2 border-b-[var(--accent-primary)]',
  desktopInactive: 'text-[var(--subtext0)] font-medium border-b-2 border-b-transparent',
  mobileActive: 'text-[var(--text)] font-semibold border-b-2 border-b-transparent',
  mobileInactive: 'text-[var(--subtext0)] font-medium border-b-2 border-b-transparent',
}

// Count-Chip-Tönung je Aktiv-Zustand — als className-Override auf das Badge-Atom
// (Badge trägt rounded-full + inline-flex; hier nur die Tab-spezifische Tönung).
const COUNT_TONE = {
  active: 'bg-[var(--accent-primary)] text-[var(--on-accent)]',
  inactive: 'bg-[var(--surface0)] text-[var(--subtext0)]',
}

export default function TabButton({
  active = false,
  count,
  icon,
  children,
  mobile = false,
  onClick,
  className = '',
  ...rest
}) {
  const layoutClasses = mobile ? LAYOUT.mobile : LAYOUT.desktop
  const stateClasses = mobile
    ? active
      ? STATE.mobileActive
      : STATE.mobileInactive
    : active
      ? STATE.desktopActive
      : STATE.desktopInactive
  const countTone = active ? COUNT_TONE.active : COUNT_TONE.inactive

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-ui="tab-button"
      onClick={onClick}
      tabIndex={active ? 0 : -1}
      className={`inline-flex items-center justify-center bg-transparent border-0 border-t-2 border-t-transparent font-[var(--font-display,system-ui)] tracking-[-0.01em] cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${layoutClasses} ${stateClasses} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {typeof count === 'number' && (
        <Badge
          size="sm"
          data-ui="tab-button.count"
          className={`px-1.5 py-px text-[10px] font-bold leading-snug font-[var(--font-display,system-ui)] ${countTone}`}
        >
          {count}
        </Badge>
      )}
    </button>
  )
}
