/**
 * Input — kanonisches, token-sauberes Text-Eingabe-Atom (einzeilig).
 * Pendant zu Textarea (Pattern P05/P19). Props-driven, kein Store/Fetch,
 * keine Domänen-Begriffe. font-size 16px (text-base) gegen iOS-Zoom auf Focus.
 *
 * Such-/Filter-Felder mit führendem Icon sind eine Molecule (SearchField),
 * nicht dieses Atom.
 *
 * @param {object} props
 * @param {string} [props.dataUiScope='input']
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export default function Input({ dataUiScope = 'input', className = '', ...rest }) {
  return (
    <input
      data-ui={dataUiScope}
      className={`w-full rounded-lg px-3 py-2 text-base border-0 outline-none bg-[var(--surface0)] text-[var(--text)] placeholder:text-[var(--subtext0)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    />
  )
}
