/**
 * Textarea — kanonisches, token-sauberes Atom (DD-56 Harvest).
 * Mehrzeiliges Pendant zu Input (Pattern P05/P19).
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe. Reines Display-Primitiv.
 *
 * - auto-resize via vertikalem Resize-Handle (resize-y).
 * - font-size 16px (text-base) gegen iOS-Zoom auf Focus.
 *
 * @param {object} props
 * @param {number} [props.rows=3] - sichtbare Zeilenzahl
 * @param {boolean} [props.disabled] - deaktiviert das Feld
 * @param {string} [props.className] - zusätzliche Klassen
 */
export default function Textarea({ rows = 3, className = '', ...rest }) {
  return (
    <textarea
      data-ui="textarea"
      rows={rows}
      className={`w-full rounded-lg px-3 py-2 text-base border-0 outline-none resize-y bg-[var(--surface0)] text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    />
  )
}
