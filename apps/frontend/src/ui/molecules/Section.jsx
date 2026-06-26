/**
 * Section — betitelter Reintext-Abschnitt (Goal/Background/Description im
 * TextWidget): Display-Caps-Label über fließendem Text (`children`).
 *
 * Presentational, props-driven. Kein Toggle (das ist `WidgetBase`), keine
 * Eingabe — nur Beschriftung + Lesetext.
 *
 * @param {object} props
 * @param {React.ReactNode} props.label - Abschnitts-Label (Display-Caps)
 * @param {string} [props.dataUiScope='molecule.section']
 * @param {React.ReactNode} props.children - Abschnitts-Text
 * @param {string} [props.className]
 */
export default function Section({ label, dataUiScope = 'molecule.section', children, className = '' }) {
  return (
    <div data-ui={dataUiScope} className={className}>
      <div
        data-ui={`${dataUiScope}.label`}
        className="[font-family:var(--font-display)] text-[10px] font-bold tracking-[0.08em] uppercase text-[var(--overlay1)] mb-[3px]"
      >
        {label}
      </div>
      <div data-ui={`${dataUiScope}.body`} className="text-[13px] leading-[1.5] text-[var(--subtext1)]">
        {children}
      </div>
    </div>
  )
}
