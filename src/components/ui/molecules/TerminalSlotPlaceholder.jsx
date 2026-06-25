/**
 * TerminalSlotPlaceholder — kanonische, token-saubere Variante (DD-481 Harvest).
 * Platzhalter-Region für einen noch nicht aktivierten Bottom-Slot.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {string} [props.icon='▮'] - Icon-Glyph (aria-hidden)
 * @param {import('react').ReactNode} [props.title='Terminal'] - Titel-Zeile
 * @param {import('react').ReactNode} [props.meta] - Meta-/Untertitel-Zeile
 * @param {string} [props.ariaLabel] - aria-label der Region
 * @param {string} [props.className] - zusätzliche Klassen
 */

export default function TerminalSlotPlaceholder({
  icon = '▮',
  title = 'Terminal',
  meta = 'Coming in M5 · Eingebetteter Terminal-Emulator',
  ariaLabel = 'Terminal-Slot — wird in M5 aktiviert',
  className = '',
  ...rest
}) {
  return (
    <div
      data-ui="terminal-slot-placeholder"
      role="region"
      aria-label={ariaLabel}
      className={`flex items-center gap-3 rounded-lg border border-dashed border-[var(--surface2)] bg-[var(--surface1)] px-4 py-3 text-[var(--subtext0)] ${className}`}
      {...rest}
    >
      <div data-ui="terminal-slot-placeholder.icon" className="text-xl leading-none text-[var(--subtext1)]" aria-hidden="true">
        {icon}
      </div>
      <div data-ui="terminal-slot-placeholder.body" className="flex flex-col gap-0.5">
        <div data-ui="terminal-slot-placeholder.title" className="text-sm font-medium text-[var(--text)]">{title}</div>
        <div data-ui="terminal-slot-placeholder.meta" className="text-xs text-[var(--subtext0)]">{meta}</div>
      </div>
    </div>
  )
}
