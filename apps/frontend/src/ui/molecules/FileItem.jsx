/**
 * FileItem — kompakte Anhang-/Datei-Zeile: führendes Datei-Icon, Name (ellipsiert),
 * optionale Meta-Angabe, rechts eine Icon-Aktion (Default: Download).
 *
 * Komposition: nutzt `Icon` (führend) + das Atom `IconButton` (Aktion). Statt
 * eines rohen `<button>` immer das Atom. Presentational, props-driven.
 *
 * @param {object} props
 * @param {React.ReactNode} props.name - Dateiname
 * @param {React.ReactNode} [props.meta] - Meta (z.B. Größe/Datum)
 * @param {string} [props.dataUiScope='molecule.fileItem']
 * @param {()=>void} [props.onAction] - Klick auf die Aktion
 * @param {string} [props.actionIcon='download'] - Registry-Key der Aktion
 * @param {string} [props.actionLabel='Herunterladen'] - aria-label der Aktion
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'
import IconButton from '../atoms/IconButton.jsx'

export default function FileItem({
  name, meta, dataUiScope = 'molecule.fileItem',
  onAction, actionIcon = 'download', actionLabel = 'Herunterladen', className = '',
}) {
  return (
    <div
      data-ui={dataUiScope}
      className={`flex items-center gap-2 p-1 rounded-sm border border-[var(--border)] bg-[var(--base)] ${className}`}
    >
      <Icon name="file" size={12} mono />
      <span
        data-ui={`${dataUiScope}.name`}
        className="flex-1 min-w-0 text-[11px] leading-[1.2] text-[var(--text)] overflow-hidden text-ellipsis whitespace-nowrap"
      >
        {name}
      </span>
      {meta != null && (
        <span data-ui={`${dataUiScope}.meta`} className="text-[10px] text-[var(--subtext0)]">{meta}</span>
      )}
      <IconButton
        size="sm"
        iconName={actionIcon}
        label={actionLabel}
        onClick={onAction}
        dataUiScope={`${dataUiScope}.action`}
      />
    </div>
  )
}
