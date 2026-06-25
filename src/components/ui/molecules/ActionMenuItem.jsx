import Kbd from '../atoms/Kbd.jsx'

/**
 * ActionMenuItem — Molecule (04.30 Action, GF-236). Eine Menüzeile für Overflow-/
 * Bulk-Menüs: führendes Icon + Label + optionaler Tastatur-Shortcut (Kbd-Atom,
 * rechtsbündig). Rendert ihr eigenes `role="menuitem"`-Button-Root (NavItem-/
 * TabButton-Präzedenz) und komponiert das `Kbd`-Atom.
 *
 * Dumb-Molecule (CONV-molecule-boundary): präsentational, kein Menü-/Focus-State —
 * den Klick und die Menü-Mechanik verdrahtet der konsumierende Organismus.
 * Token-clean, logische RTL-Utilities (ms-auto).
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon] - führendes Icon (Node).
 * @param {import('react').ReactNode} [props.children] - Label (leer = icon-only → label Pflicht).
 * @param {string} [props.label] - aria-label; Pflicht im icon-only-Modus (keine children).
 * @param {string|string[]} [props.shortcut] - Tasten-Glyph(en) → Kbd-Atom(e).
 * @param {boolean} [props.danger=false] - destruktive Aktion (Danger-Akzent).
 * @param {boolean} [props.disabled=false]
 * @param {()=>void} [props.onClick]
 * @param {string} [props.className]
 */
const TONE = {
  default: 'text-[var(--text)] hover:bg-[var(--surface0)]',
  danger: 'text-[var(--accent-danger)] hover:bg-[var(--surface0)]',
}

export default function ActionMenuItem({
  icon,
  children,
  label,
  shortcut,
  danger = false,
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  const keys = shortcut == null ? [] : Array.isArray(shortcut) ? shortcut : [shortcut]
  const iconOnly = children == null || children === ''
  // icon-only braucht eine zugängliche Bezeichnung → label als aria-label.
  const ariaLabel = label || (iconOnly && typeof children === 'string' ? children : undefined)
  return (
    <button
      type="button"
      role="menuitem"
      data-ui="action-menu-item"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={iconOnly ? ariaLabel : undefined}
      className={`inline-flex items-center gap-2 ${iconOnly ? 'w-auto justify-center' : 'w-full'} rounded-lg px-3 py-2 text-[13px] text-start bg-transparent border-0 cursor-pointer transition-colors duration-[var(--duration-fast)] ease-standard disabled:opacity-50 disabled:cursor-not-allowed ${danger ? TONE.danger : TONE.default} ${className}`}
      {...rest}
    >
      {icon}
      {!iconOnly && <span className="truncate">{children}</span>}
      {keys.length > 0 && (
        <span data-ui="action-menu-item.kbd" className="ms-auto inline-flex items-center gap-1">
          {keys.map((k, i) => (
            <Kbd key={i} size="sm">{k}</Kbd>
          ))}
        </span>
      )}
    </button>
  )
}
