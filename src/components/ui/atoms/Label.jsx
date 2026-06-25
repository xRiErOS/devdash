/**
 * Label — Atom (03.10 Inputs). Form-Feld-Beschriftung auf nativem `<label>`.
 * Bindet via `htmlFor` an das zugehörige Feld (Klick fokussiert das Feld,
 * Screenreader liest die Beschriftung). `required` rendert einen reinen
 * Deko-`*`-Marker (`--accent-danger`, `aria-hidden`) — die maschinenlesbare
 * Pflicht-Semantik gehört ans Feld selbst (`required`/`aria-required`).
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex. Farben via var(--token)-Klassen.
 * Props-driven, kein Store/Fetch, keine Domaenen-Begriffe. `...rest` forwardet.
 *
 * @param {object} props
 * @param {string} [props.htmlFor] - id des beschrifteten Feldes
 * @param {boolean} [props.required=false] - rendert "*"-Marker (Deko, aria-hidden)
 * @param {'sm'|'md'} [props.size='md'] - sm = text-xs, md = text-sm
 * @param {import('react').ReactNode} [props.children] - Beschriftungstext
 * @param {string} [props.className]
 */
const SIZE = { sm: 'text-xs', md: 'text-sm' }

export default function Label({
  htmlFor,
  required = false,
  size = 'md',
  children,
  className = '',
  ...rest
}) {
  const sizeCls = SIZE[size] || SIZE.md
  return (
    <label
      data-ui="label"
      htmlFor={htmlFor}
      className={`inline-flex items-center gap-1 font-medium text-[var(--text)] select-none ${sizeCls} ${className}`}
      {...rest}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-[var(--accent-danger)]">*</span>
      )}
    </label>
  )
}
