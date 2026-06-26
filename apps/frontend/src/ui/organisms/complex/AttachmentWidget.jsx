/**
 * AttachmentWidget — Datei-Anhänge: Stack aus FileItems + Dropzone am Boden.
 * Konkreter Organism im Content-Stack.
 *
 * Komposition: `WidgetBase` + `FileItem` (Molecule) + `IconButton` (Hinzufügen)
 * + `Icon` (Dropzone). Presentational, props-driven.
 *
 * @param {object} props
 * @param {Array<{name:string, meta:string}>} [props.files=[]]
 * @param {boolean} [props.collapsed]
 * @param {()=>void} [props.onToggle]
 * @param {string} [props.dataUiScope='organism.widget.attachments']
 */
import WidgetBase from '../../molecules/WidgetBase.jsx'
import FileItem from '../../molecules/FileItem.jsx'
import IconButton from '../../atoms/IconButton.jsx'
import Icon from '../../foundations/Icon.jsx'

export default function AttachmentWidget({ files = [], collapsed, onToggle, dataUiScope = 'organism.widget.attachments' }) {
  return (
    <WidgetBase
      title="Anhänge"
      collapsed={collapsed}
      onToggle={onToggle}
      dataUiScope={dataUiScope}
      action={<IconButton iconName="add" label="Datei hinzufügen" size="sm" dataUiScope={`${dataUiScope}.add`} />}
    >
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <FileItem key={f.name} name={f.name} meta={f.meta} dataUiScope={`${dataUiScope}.file-${f.name}`} />
        ))}
      </div>
      <div data-ui={`${dataUiScope}.drop`} className="flex items-center justify-center gap-2 p-1 mt-2 rounded-sm border border-dashed border-[var(--overlay0)] text-[11px] leading-[1.2] text-[var(--subtext0)]">
        <Icon name="file-add" size={12} mono />
        <span>Dateien ablegen oder <b>hinzufügen</b></span>
      </div>
    </WidgetBase>
  )
}
