/**
 * DocstringBlock — Atom (03.20 Display). Goal/Beschreibung im Docstring-Stil
 * `""" … """` mit Akzent-Linksrule (Terminal/IDE-Look der EntityDetail V2).
 * Hausschrift --font-display, gedämpfter Fließtext.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children - Goal-/Beschreibungstext.
 * @param {string} [props.className]
 */
export default function DocstringBlock({ children, className = '', ...rest }) {
  return (
    <p
      data-ui="docstring-block"
      className={`border-l-2 border-[var(--accent-primary)] px-4 py-3 [font-family:var(--font-display)] text-[13px] leading-relaxed text-[var(--subtext1)] ${className}`}
      {...rest}
    >
      <span className="text-[var(--overlay1)]">{'""" '}</span>{children}<span className="text-[var(--overlay1)]">{' """'}</span>
    </p>
  )
}
