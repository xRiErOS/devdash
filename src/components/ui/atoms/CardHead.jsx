/**
 * CardHead — kanonischer Card-Header (DD-481 Extract aus SettingsSidebar.jsx).
 * Icon-Wrap (24x24, surface0-bg, radius-sm) + H3-Titel (Mono 13/700).
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon] - Icon-Inhalt (z.B. lucide-react-Element); ohne Icon entfällt der Icon-Wrap
 * @param {import('react').ReactNode} [props.title] - Titeltext (alternativ via children)
 * @param {import('react').ReactNode} [props.children] - Titel-Inhalt, falls kein title-Prop
 * @param {import('react').ReactNode} [props.actions] - rechtsbündiger Action-Slot (z.B. Copy-IconButton)
 * @param {'md'|'lg'} [props.size='md'] - DD-606: Titel-Größenstufe. 'md' = 13px (Default,
 *   unverändert), 'lg' = 15px → liest klarer als Sektions-Titel (DESIGN.md: Hierarchie
 *   über Größe+Gewicht). Gewicht/Font bleiben in beiden Stufen identisch.
 * @param {string} [props.className] - zusätzliche Klassen
 */
export default function CardHead({ icon, title, children, actions, size = 'md', className = '', ...rest }) {
  const titleSize = size === 'lg' ? 'text-[15px]' : 'text-[13px]'
  return (
    <div
      data-ui="card-head"
      className={`flex items-center gap-2 mb-3 ${className}`}
      {...rest}
    >
      {icon != null && (
        <span data-ui="card-head.icon" className="grid place-items-center w-6 h-6 rounded-md bg-[var(--surface0)] text-[var(--subtext0)] shrink-0">
          {icon}
        </span>
      )}
      <h3 data-ui="card-head.title" className={`m-0 ${titleSize} font-bold text-[var(--text)] font-[var(--font-display,system-ui)]`}>
        {title ?? children}
      </h3>
      {actions != null && (
        <div data-ui="card-head.actions" className="ml-auto flex items-center gap-1 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
