/**
 * DDLogo — DD-Marken-Logo als klickbarer Button-Atom.
 * Kapselt den Quick-Switcher-Trigger (app-shell.topbar.quickswitcher).
 * SVG inline (kein img-Pfad), Farben via CSS-Tokens → theme-adaptiv.
 * Presentational: kein Store/Router/fetch.
 *
 * @param {object} props
 * @param {() => void} [props.onClick]
 * @param {number} [props.size=28] - Logo-Größe in Pixel
 * @param {string} [props.label='Quick-Switcher öffnen'] - aria-label
 * @param {string} [props.className]
 */
export default function DDLogo({
  onClick,
  size = 28,
  label = 'Quick-Switcher öffnen',
  className = '',
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-ui="dd-logo"
      onClick={onClick}
      className={`rounded-[6px] opacity-90 hover:opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)] ${className}`.trim()}
      {...rest}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="14" fill="var(--crust)" />
        <text
          x="32"
          y="42"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight="700"
          fontSize="30"
          textAnchor="middle"
          fill="var(--peach)"
        >
          DD
        </text>
        <circle cx="50" cy="14" r="5" fill="var(--green)" />
      </svg>
    </button>
  )
}
