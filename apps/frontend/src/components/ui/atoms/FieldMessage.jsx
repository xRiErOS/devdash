/**
 * FieldMessage — Atom (Cluster 03.10 Inputs). Begleittext unter einem
 * Eingabefeld: Validierungsfehler (tone=error), Warnung (tone=warning),
 * neutrale Info (tone=info) oder dezenter Hinweis (tone=hint).
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex. Farben via Tailwind-v4-Arbitrary-Tokens.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe. `...rest` forwardet
 * (z.B. data-* / aria-*) an das Wurzel-Element.
 *
 * a11y: tone=error rendert role="alert" (Live-Region für Validierungsfehler).
 * `id` per Prop, damit das Feld es via aria-describedby referenzieren kann.
 *
 * @param {object} props
 * @param {'error'|'warning'|'info'|'hint'} [props.tone='error'] - error → --accent-danger + role=alert; warning → --accent-warning; info → --accent-info; hint → --subtext0
 * @param {string} [props.id] - Ziel für aria-describedby am zugehörigen Feld
 * @param {import('react').ReactNode} [props.children]
 * @param {string} [props.className]
 */
const TONE = {
  error: 'text-[var(--accent-danger)]',
  warning: 'text-[var(--accent-warning)]',
  info: 'text-[var(--accent-info)]',
  hint: 'text-[var(--subtext0)]',
}

export default function FieldMessage({ tone = 'error', children, className = '', ...rest }) {
  const color = TONE[tone] || TONE.error
  return (
    <p
      data-ui="field-message"
      role={tone === 'error' ? 'alert' : undefined}
      className={`mt-1 text-xs ${color} ${className}`}
      {...rest}
    >
      {children}
    </p>
  )
}
