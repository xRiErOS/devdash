/**
 * IconButton — kanonisches Atom (token-clean, harvested aus ui/IconButton.jsx).
 * Konsistente Icon-Action-Buttons mit Touch-Target. Props-driven, kein Store/Fetch.
 *
 * @param {object} props
 * @param {React.ReactNode} props.icon - Lucide-Icon-Element
 * @param {string} props.label - aria-label/title (mandatory)
 * @param {() => void} [props.onClick]
 * @param {'sm'|'md'|'lg'} [props.size='md'] - sm=28, md=36, lg=44 (Touch-Target)
 * @param {'default'|'primary'|'danger'|'ghost'} [props.variant='default']
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
const SIZE_MAP = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
}

// Jede Variante erzwingt die Icon-Farbe via [&_svg]:text-[…] auf das Token, das
// zur jeweiligen Hintergrundfläche kontrastiert (WCAG AA). Das überschreibt die
// Eigen-Rollenfarbe, die <Icon> selbst setzt (ROLE_CLASS am SVG) — sonst rendert
// z.B. primary (Akzent-Fläche) ein grünes success-Icon → Kontrast-Verstoß (B01).
// Gefüllte Akzent-Flächen (primary) → --on-accent; neutrale/transparente Flächen
// tragen ihr eigenes kontrastreiches Vordergrund-Token am Icon.
const VARIANT_MAP = {
  default: 'bg-[var(--surface1)] text-[var(--text)] [&_svg]:text-[var(--text)]',
  primary: 'bg-[var(--accent-primary)] text-[var(--on-accent)] [&_svg]:text-[var(--on-accent)]',
  danger: 'bg-[var(--surface1)] text-[var(--accent-danger)] [&_svg]:text-[var(--accent-danger)]',
  ghost: 'bg-transparent text-[var(--subtext0)] [&_svg]:text-[var(--subtext0)]',
}

// Zentrales Hover-Reveal-Muster für sekundäre/Ghost-Controls: standardmäßig unsichtbar,
// erscheint beim Hover/Focus IRGENDWO im nächsten `group`-Vorfahren (WidgetBase, CaptureWidget,
// WidgetHeading-Action-Slot). EINE Definition → an allen call-sites via `reveal`-Prop synchron.
// (transition-opacity trägt der IconButton-Base bereits.)
export const REVEAL_ON_HOVER = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'

export default function IconButton({
  icon,
  label,
  onClick,
  size = 'md',
  variant = 'default',
  disabled = false,
  reveal = false,
  className = '',
  ...rest
}) {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md
  const variantClasses = VARIANT_MAP[variant] || VARIANT_MAP.default

  return (
    <button
      type="button"
      data-ui="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${reveal ? `${REVEAL_ON_HOVER} ` : ''}${className}`}
      {...rest}
    >
      {icon}
    </button>
  )
}
