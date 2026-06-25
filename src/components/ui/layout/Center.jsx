// src/components/ui/layout/Center.jsx

// GF-226 (D10-C): fluid sizing — max-width als rem (kein fixer px), via statischer
// Klassen-Map (0 inline-style; Tailwind-JIT sieht die Werte). Horizontale Gutters
// binden an die --space-*-Tokens (4px-Grid).
const MAX = {
  sm: 'max-w-[30rem]',
  md: 'max-w-[40rem]',
  lg: 'max-w-[60rem]',
}
const GUTTER = {
  none: 'px-0',
  sm: 'px-[var(--space-2)]',
  md: 'px-[var(--space-4)]',
  lg: 'px-[var(--space-6)]',
}

/**
 * Center — horizontal zentrierte Inhaltsspalte mit fluider Max-Breite (Every
 * Layout). Optional `intrinsic` zentriert auch die Kinder entlang der Achse
 * (z.B. Empty-States / Cover-artige Regionen).
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.max='md'] - Max-Breite der Spalte (30/40/60rem)
 * @param {'none'|'sm'|'md'|'lg'} [props.gutters='md'] - horizontaler Innenabstand (--space-*)
 * @param {boolean} [props.intrinsic=false] - Kinder zusätzlich entlang der Achse zentrieren
 */
export default function Center({ max = 'md', gutters = 'md', intrinsic = false, className = '', children, ...rest }) {
  const m = MAX[max] || MAX.md
  const g = GUTTER[gutters] || GUTTER.md
  const intrinsicClass = intrinsic ? 'flex flex-col items-center' : ''
  return (
    <div className={`mx-auto w-full ${m} ${g} ${intrinsicClass} ${className}`} {...rest}>
      {children}
    </div>
  )
}
