/**
 * TreeRow — eine Zeile der Navigations-Hierarchie (Milestone → Sprint → Issue).
 * Einrückung über `indent`, auf-/zugeklappter Textcaret, farbcodierte ID via
 * `EntityId`, fetter Lead (Sprint-/Milestone-Name) bzw. normaler Issue-Titel.
 *
 * Komposition: nutzt das Atom `EntityId` (ID). Presentational, props-driven;
 * der Caret ist ein Textglyph (▾/▸), kein eigener Toggle — Klick-Logik liegt
 * im Consumer.
 *
 * @param {object} props
 * @param {0|1|2} [props.indent=0] - Einrücktiefe
 * @param {'open'|'closed'|'none'} [props.caret='none'] - Aufklapp-Caret
 * @param {React.ReactNode} [props.id] - Entitäts-ID (z.B. 'DD2-7')
 * @param {'issue'|'sprint'|'milestone'} [props.idKind] - Farbe der ID
 * @param {React.ReactNode} [props.lead] - fetter Name (Sprint/Milestone)
 * @param {React.ReactNode} [props.label] - normaler Titel (Issue)
 * @param {boolean} [props.active=false]
 * @param {string} [props.dataUiScope='molecule.treeRow']
 * @param {string} [props.className]
 */
import EntityId from '../atoms/EntityId.jsx'

const INDENT = { 0: 'pl-2', 1: 'pl-5', 2: 'pl-[36px]' }
const CARET = { open: '▾', closed: '▸' }

export default function TreeRow({
  indent = 0, caret = 'none', id, idKind, lead, label, active = false,
  dataUiScope = 'molecule.treeRow', className = '',
}) {
  const state = active ? 'bg-[var(--state-active)] text-[var(--text)]' : 'hover:bg-[var(--state-hover)]'
  return (
    <div
      data-ui={dataUiScope}
      className={`flex items-center gap-2 py-1 px-2 rounded-sm text-[13px] text-[var(--subtext1)] ${INDENT[indent] || INDENT[0]} ${state} ${className}`}
    >
      {caret !== 'none' && (
        <span data-ui={`${dataUiScope}.caret`} className="w-3 text-center text-[var(--overlay0)]">
          {CARET[caret]}
        </span>
      )}
      {id != null && (
        <EntityId kind={idKind} dataUiScope={`${dataUiScope}.id`}>{id}</EntityId>
      )}
      {lead != null && (
        <span data-ui={`${dataUiScope}.lead`} className="[font-family:var(--font-display)] font-bold text-[12px] text-[var(--text)]">
          {lead}
        </span>
      )}
      {label != null && (
        <span data-ui={`${dataUiScope}.label`}>{label}</span>
      )}
    </div>
  )
}
