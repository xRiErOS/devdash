/**
 * Chip — kleines, klickbares Filter-/Auswahl-Pill (z.B. Prioritäten P1–P4).
 * Atom: rendert ein echtes <button>, props-driven. `active` markiert den
 * gewählten Zustand.
 *
 * @param {object} props
 * @param {boolean} [props.active=false] - ausgewählt
 * @param {React.ReactNode} props.children
 * @param {string} [props.dataUiScope='chip']
 * @param {string} [props.className]
 */
export default function Chip({ active = false, children, dataUiScope = 'chip', className = '', ...rest }) {
  const tone = active
    ? 'bg-[var(--state-active)] text-[var(--text)] border-[var(--border)]'
    : 'bg-[var(--base)] text-[var(--subtext1)] border-[var(--border)]'
  return (
    <button
      type="button"
      data-ui={dataUiScope}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full px-2 py-0.5 [font-family:var(--font-display)] text-[11px] border ${tone} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
