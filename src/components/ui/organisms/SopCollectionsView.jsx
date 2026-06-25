import WidgetBase from './WidgetBase.jsx'
import Button from '../atoms/Button.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Select from '../atoms/Select.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

/**
 * SopCollectionsView — präsentationale SOP-Collections-Ansicht (GF-2 ProjectPages
 * S3 T1, D-E). WidgetBase-Shell (Layer-3). Modelliert die fünf D-E-Funktionen rein
 * präsentational (alle Mutationen Callback-delegiert):
 *   1. SOP neu anlegen (onCreateSop) — Heading-Action
 *   2. SOP in Collection einsortieren (onAssignCollection) — Select je SOP
 *   3. Collection-Liste exportieren (onExportList) — Action je Collection
 *   4. ganze Collection kopieren (onCopyCollection) — Action je Collection
 *   5. Collection-Link-Liste kopieren (onCopyLinkList) — Action je Collection
 *
 * PRESENTATIONAL: kein Store/Fetch. Live = Backend-Track T-be2 (Collections-Schema +
 * Export/Copy-Endpunkte), NICHT hier — SOP-Daten via Fixtures.
 *
 * @param {object} props
 * @param {Array<{key:string,title:string,collection?:string}>} [props.sops=[]]
 * @param {Array<{id:string,name:string,sopKeys:string[]}>} [props.collections=[]]
 * @param {()=>void} [props.onCreateSop] - neue SOP anlegen (Screen macht Inline/Modal)
 * @param {(sopKey:string,colId:string)=>void} [props.onAssignCollection] - SOP einsortieren
 * @param {(colId:string)=>void} [props.onExportList] - Collection-Liste exportieren
 * @param {(colId:string)=>void} [props.onCopyCollection] - ganze Collection kopieren
 * @param {(colId:string)=>void} [props.onCopyLinkList] - Collection-Link-Liste kopieren
 * @param {string} [props.heading='SOP Collections']
 * @param {string} [props.dataUi='sop-collections']
 */
export default function SopCollectionsView({
  sops = [],
  collections = [],
  onCreateSop = noop,
  onAssignCollection = noop,
  onExportList = noop,
  onCopyCollection = noop,
  onCopyLinkList = noop,
  heading = 'SOP Collections',
  dataUi = 'sop-collections',
}) {
  const byKey = new Map(sops.map((s) => [s.key, s]))
  const colOptions = collections.map((c) => ({ value: c.id, label: c.name }))

  const createAction = (
    <Button
      size="sm"
      variant="primary"
      leadingIcon={<Icon name="add" size={14} inherit />}
      onClick={onCreateSop}
      data-ui={`${dataUi}.create`}
    >
      Neue SOP
    </Button>
  )

  return (
    <WidgetBase heading={heading} action={createAction} dataUi={dataUi}>
      {collections.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<Icon name="folder" size={20} mono />}
          title="Keine Collections."
          description="Neue SOP anlegen und einer Sammlung zuordnen."
        />
      ) : (
        <ul data-ui={`${dataUi}.list`} role="list" className="flex flex-col gap-3">
          {collections.map((col) => {
            const colUi = `${dataUi}.collection-${col.id}`
            const keys = Array.isArray(col.sopKeys) ? col.sopKeys : []
            return (
              <li
                key={col.id}
                data-ui={colUi}
                className="flex flex-col gap-2 rounded-lg border border-[var(--surface2)] bg-[var(--layer-4)] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Icon name="folder" size={14} mono />
                  <span data-ui={`${colUi}.name`} className="flex-1 min-w-0 text-sm font-medium text-[var(--text)] break-words">
                    {col.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    <IconButton icon={<Icon name="download" size={14} inherit />} label={`Liste „${col.name}" exportieren`} size="sm" variant="ghost" reveal onClick={() => onExportList(col.id)} data-ui={`${colUi}.action.export`} />
                    <IconButton icon={<Icon name="copy" size={14} inherit />} label={`Collection „${col.name}" kopieren`} size="sm" variant="ghost" reveal onClick={() => onCopyCollection(col.id)} data-ui={`${colUi}.action.copy`} />
                    <IconButton icon={<Icon name="link" size={14} inherit />} label={`Link-Liste „${col.name}" kopieren`} size="sm" variant="ghost" reveal onClick={() => onCopyLinkList(col.id)} data-ui={`${colUi}.action.linklist`} />
                  </span>
                </div>

                {keys.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={<Icon name="file" size={18} mono />}
                    title="Leere Sammlung."
                    description="SOP per Auswahl einsortieren."
                  />
                ) : (
                  <ul role="list" className="flex flex-col gap-1">
                    {keys.map((key) => {
                      const sop = byKey.get(key)
                      const sopUi = `${colUi}.sop-${key}`
                      return (
                        <li key={key} data-ui={sopUi} className="flex items-center gap-2 rounded-sm bg-[var(--surface0)] px-2 py-1.5">
                          <Icon name="file" size={13} mono />
                          <span data-ui={`${sopUi}.title`} className="flex-1 min-w-0 text-sm text-[var(--text)] break-words">
                            {sop ? sop.title : key}
                          </span>
                          <span className="shrink-0">
                            <Select
                              size="sm"
                              options={colOptions}
                              value={col.id}
                              onChange={(e) => onAssignCollection(key, e.target.value)}
                              aria-label={`SOP „${sop ? sop.title : key}" einsortieren`}
                              data-ui={`${sopUi}.assign`}
                            />
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </WidgetBase>
  )
}
