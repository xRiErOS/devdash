/**
 * FormField — betiteltes Eingabe-Wrapping: Label (Display-Caps) über dem
 * Eingabe-Atom (Input/Textarea kommt als `children` vom Consumer).
 *
 * Rendert das `<label>` selbst (legitimes Eingabe-Wrapping, Regel 4): das Atom
 * bleibt das Feld, FormField liefert nur Beschriftung + vertikalen Stack.
 * Presentational, props-driven, kein Store/Fetch.
 *
 * @param {object} props
 * @param {React.ReactNode} props.label - Beschriftungstext (Display-Caps)
 * @param {string} [props.htmlFor] - id des umschlossenen Eingabe-Atoms
 * @param {string} [props.dataUiScope='molecule.formField']
 * @param {React.ReactNode} props.children - das Eingabe-Atom
 */
export default function FormField({ label, htmlFor, dataUiScope = 'molecule.formField', children }) {
  return (
    <label data-ui={dataUiScope} htmlFor={htmlFor} className="flex flex-col gap-1">
      <span
        data-ui={`${dataUiScope}.label`}
        className="[font-family:var(--font-display)] text-[10px] font-bold tracking-[0.06em] uppercase text-[var(--overlay1)]"
      >
        {label}
      </span>
      {children}
    </label>
  )
}
