/**
 * Kbd — visuelle Tastatur-Taste (`⌘`, `K`, `esc`, `⇧`).
 * Reines Display-Atom für Shortcut-Anzeigen (Command-Bar, Command-Palette,
 * Menü-Mnemonics). Props-driven, kein Verhalten.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Tasten-Glyph/Text
 * @param {string} [props.dataUiScope='kbd']
 * @param {string} [props.className]
 */
export default function Kbd({ children, dataUiScope = 'kbd', className = '', ...rest }) {
  return (
    <span
      data-ui={dataUiScope}
      className={`inline-flex items-center gap-[3px] rounded-sm px-1.5 py-0.5 [font-family:var(--font-display)] text-[11px] bg-[var(--surface0)] text-[var(--subtext0)] border border-[var(--border)] ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
