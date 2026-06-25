/**
 * MetaRow — kanonische, token-saubere Variante (DD-481 Extract aus SettingsSidebar).
 * Zweispaltige Label+Value-Zeile (Label 80px, Value 1fr). Optionaler Color-Dot vor dem Value.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe. Reine Display-Props.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label - Label-Text (linke Spalte, uppercase)
 * @param {import('react').ReactNode} [props.value] - Value-Inhalt (rechte Spalte)
 * @param {import('react').ReactNode} [props.children] - Alternative zu value (rechte Spalte)
 * @param {boolean} [props.dot=false] - zeigt einen Color-Dot vor dem Value.
 *   Die Dot-Farbe wird per CSS-Variable `--dot-color` gesetzt (Default: currentColor),
 *   z.B. via className `[--dot-color:var(--accent-success)]` — token-clean, kein inline-style.
 * @param {string} [props.className] - zusätzliche Klassen für die Wurzel
 */
export default function MetaRow({ label, value, children, dot = false, className = '', ...rest }) {
  const content = value != null ? value : children
  return (
    <div
      data-ui="meta-row"
      className={`grid grid-cols-[80px_1fr] items-center gap-2 ${className}`}
      {...rest}
    >
      <span data-ui="meta-row.label" className="text-[11px] uppercase tracking-[0.05em] text-[var(--text)]">
        {label}
      </span>
      <span data-ui="meta-row.value" className="inline-flex items-center gap-1.5 break-words text-xs text-[var(--text)]">
        {dot && (
          <span data-ui="meta-row.icon" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--dot-color,currentColor)]" />
        )}
        {content}
      </span>
    </div>
  )
}
