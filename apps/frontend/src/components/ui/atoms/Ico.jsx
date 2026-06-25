/**
 * Ico — kanonischer, token-sauberer Icon-Wrapper/Slot (DD-56 Extract aus SettingsSidebar).
 * Rendert einen stroked SVG-Slot, der beliebige <path>/<circle>/<line>-Children aufnimmt.
 * Props-driven, kein State/Store/Fetch, keine Domänen-Begriffe. Reiner Display-Slot.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon] - SVG-Innen-Elemente (paths, circles, lines …)
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Icon-Kantenlänge
 * @param {string} [props.className] - zusätzliche Klassen
 */

// Feste px-Kantenlängen je Size. Statisch, damit der Tailwind-JIT-Scanner
// die Werte literal sieht (keine String-Interpolation im Token).
const SIZE_MAP = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
}

export default function Ico({ icon, size = 'md', className = '', ...rest }) {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md

  return (
    <svg
      data-ui="ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${sizeClasses} ${className}`}
      {...rest}
    >
      {icon}
    </svg>
  )
}
