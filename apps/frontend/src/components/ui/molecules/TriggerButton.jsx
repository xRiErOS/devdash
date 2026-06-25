import Button from '../atoms/Button.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Badge from '../atoms/Badge.jsx'

/**
 * TriggerButton — Molecule (04.30 Action, GF-235). Ein Trigger für Filter-/Sort-
 * Popover: Button (mit Label) oder IconButton (iconOnly) + ein Count-Badge, der
 * die Zahl aktiver Filter/Sortierungen anzeigt.
 *
 * Dumb-Molecule (CONV-molecule-boundary): präsentational, KEIN Popover-/Open-State,
 * keine Filter-Logik. `active`/`count` sind Props; den Klick + das Popover
 * verdrahtet der konsumierende Organismus. Token-clean, logische RTL-Utilities.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon] - führendes Icon (Node).
 * @param {import('react').ReactNode} [props.children] - Label (leer → iconOnly nötig).
 * @param {string} [props.label] - aria-label für den iconOnly-Modus.
 * @param {number} [props.count=0] - aktive Filter/Sortierungen → Badge (nur bei >0).
 * @param {boolean} [props.active=false] - Trigger hervorgehoben (offen/aktiv, momentan).
 * @param {boolean} [props.pressed] - Toggle-Semantik (R2-LAB-1): gesetzt → der Trigger
 *   ist ein persistenter Umschalter. Trägt `aria-pressed`, eine durchgehend sichtbare
 *   Border (Toggle-Affordanz in JEDEM Zustand) und im gedrückten Zustand eine Akzent-
 *   Tönung (Border+Text) statt der grauen `secondary`-Fläche — harmoniert mit der
 *   bordered/ghost-Trigger-Sprache.
 * @param {boolean} [props.iconOnly=false] - rendert IconButton statt Button.
 * @param {boolean} [props.reserveCount=false] - reserviert im labeled-Modus IMMER
 *   einen fixen Count-Slot (auch ohne Count), damit der Trigger inaktiv↔aktiv KEINE
 *   Proportionsänderung erfährt (kein Sibling-Shift in Action-Leisten). Default aus
 *   (Back-Compat: ohne Count kein zusätzlicher Platz).
 * @param {boolean} [props.disabled=false]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {()=>void} [props.onClick]
 * @param {string} [props.className]
 */
export default function TriggerButton({
  icon,
  children,
  label,
  count = 0,
  active = false,
  pressed,
  iconOnly = false,
  reserveCount = false,
  disabled = false,
  size = 'md',
  onClick,
  className = '',
  'data-ui': dataUi = 'trigger-button',
  ...rest
}) {
  const isToggle = pressed !== undefined
  // Toggle (R2-LAB-1): ghost-Fläche + persistente Border; gedrückt = Akzent-Tönung
  // statt secondary-Grau. Sonst momentanes active→secondary (Filter/Sort-Trigger).
  const variant = isToggle ? 'ghost' : active ? 'secondary' : 'ghost'
  const toggleClass = isToggle
    ? pressed
      ? 'border border-[var(--accent-primary)] text-[var(--accent-primary)]'
      : 'border border-[var(--surface2)]'
    : ''
  const ariaPressed = isToggle ? pressed : undefined
  const hasCount = count > 0

  // iconOnly: Count als Eck-Overlay (Notification-Stil). Labeled: Count als
  // Bestandteil des Buttons (vertikal zentriert über items-center → konsistentes
  // Alignment, B02). Count-Badge bleibt neutral (kein Akzent-Override — der
  // verlor bei gleicher Tailwind-Spezifität, B02/B03).
  if (iconOnly) {
    return (
      <span data-ui={dataUi} className={`relative inline-flex items-center ${className}`} {...rest}>
        <IconButton
          icon={icon}
          label={label}
          onClick={onClick}
          disabled={disabled}
          size={size}
          variant={active ? 'default' : 'ghost'}
          aria-pressed={ariaPressed}
          className={toggleClass}
          data-ui={`${dataUi}.control`}
        />
        {hasCount && (
          <Badge size="sm" data-ui={`${dataUi}.count`} className="absolute -top-1 -end-1 px-1 py-0">
            {count}
          </Badge>
        )}
      </span>
    )
  }

  return (
    <span data-ui={dataUi} className={`inline-flex items-center ${className}`} {...rest}>
      <Button
        leadingIcon={icon}
        onClick={onClick}
        disabled={disabled}
        size={size}
        variant={variant}
        aria-pressed={ariaPressed}
        className={toggleClass}
        data-ui={`${dataUi}.control`}
      >
        {children}
        {reserveCount ? (
          // Proportions-stabil: fixer Count-Slot, auch ohne Count (kein Sibling-Shift).
          <span
            data-ui={`${dataUi}.count`}
            className="inline-flex min-w-[1.25rem] justify-center"
          >
            {hasCount ? <Badge size="sm" className="px-1.5 py-0">{count}</Badge> : null}
          </span>
        ) : (
          hasCount && (
            <Badge size="sm" data-ui={`${dataUi}.count`} className="px-1.5 py-0">
              {count}
            </Badge>
          )
        )}
      </Button>
    </span>
  )
}
