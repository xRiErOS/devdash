/**
 * MetaBlock — kanonische, token-saubere Variante (DD-56 Harvest).
 * Label/Value-Slot-Paar mit Top-Border-Trenner. Für Meta-Listen
 * (z.B. Detail-Seitenleisten). Props-driven, kein Store/Fetch,
 * keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.label] - Label-Slot (Uppercase-Caption)
 * @param {import('react').ReactNode} [props.value] - Value-Slot (Inhalt)
 * @param {string} [props.className] - zusätzliche Klassen
 */
export default function MetaBlock({ label, value, className = '', ...rest }) {
  return (
    <div
      data-ui="meta-block"
      className={`px-4 py-3 border-t border-[var(--surface0)] ${className}`}
      {...rest}
    >
      <div data-ui="meta-block.label" className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text)]">
        {label}
      </div>
      <div data-ui="meta-block.value" className="text-xs leading-snug text-[var(--subtext1)]">{value}</div>
    </div>
  )
}
