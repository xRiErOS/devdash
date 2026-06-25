import Button from '../atoms/Button.jsx'

/**
 * EmptyState — DD-56 Molecule (harvest aus ui/EmptyState.jsx, verlustfrei).
 * Komponiert Icon + Titel + Beschreibung + Action zu einer wiederverwendbaren
 * Leer-Zustand-Einheit. Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 * Die Action delegiert standardmäßig an das ../atoms/Button.jsx-Atom; alternativ
 * kann ein beliebiges `action`-Element (z.B. Link) übergeben werden.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.icon] - Lucide-Icon-Element (optional)
 * @param {string} props.title - Titelzeile
 * @param {string} [props.description] - Hinweistext
 * @param {React.ReactNode} [props.action] - Vorgefertigtes Action-Element (überschreibt actionLabel)
 * @param {string} [props.actionLabel] - Label für den eingebauten Button-Atom-Fallback
 * @param {() => void} [props.onAction] - Click-Handler für den eingebauten Button
 * @param {'sm'|'md'} [props.size='md'] - Dichte
 * @param {string} [props.className] - zusätzliche Klassen
 */
const PADDING = {
  sm: 'py-4 px-3',
  md: 'py-8 px-4',
}

const TITLE_SIZE = {
  sm: 'text-xs',
  md: 'text-sm',
}

const DESC_SIZE = {
  sm: 'text-[11px]',
  md: 'text-xs',
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  size = 'md',
  className = '',
  ...rest
}) {
  const padding = PADDING[size] || PADDING.md
  const titleSize = TITLE_SIZE[size] || TITLE_SIZE.md
  const descSize = DESC_SIZE[size] || DESC_SIZE.md

  const resolvedAction =
    action ??
    (actionLabel ? (
      <Button variant="secondary" size={size === 'sm' ? 'sm' : 'md'} onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null)

  return (
    <div
      data-ui="empty-state"
      className={`flex flex-col items-center justify-center text-center ${padding} ${className}`}
      {...rest}
    >
      {icon && <div data-ui="empty-state.icon" className="mb-2 text-[var(--hint)]">{icon}</div>}
      <p data-ui="empty-state.title" className={`font-medium text-[var(--subtext0)] ${titleSize}`}>{title}</p>
      {description && <p data-ui="empty-state.description" className={`mt-1 text-[var(--hint)] ${descSize}`}>{description}</p>}
      {resolvedAction && <div data-ui="empty-state.action" className="mt-3">{resolvedAction}</div>}
    </div>
  )
}
