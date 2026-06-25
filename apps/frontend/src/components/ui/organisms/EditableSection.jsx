import { Pencil } from 'lucide-react'
import Button from '../atoms/Button.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * EditableSection — DD#61 Organism (Tier=ORGANISM). Editierbares View-Segment:
 * rendert eine titulierte Sektion mit Read-/Edit-Umschaltung und Save/Cancel-Bar.
 * Domänen-bewusst: kapselt die Issue-/Sprint-/Milestone-Detail-Sektionssemantik
 * (Bearbeiten-Toggle, Fehler-Anzeige, Speichern-Pending), komponiert das Button-Atom.
 * VERBATIM aus ItemDetail.jsx `Section` extrahiert — gleiche JSX/Klassen-Semantik.
 *
 * Harvest-Hinweis (PRESENTATIONAL): Diese Quelle war bereits presentational —
 * KEINE fetch/useEffect/Store/API-Kopplung vorhanden. Save-/Edit-/Saving-/Error-
 * State kommen als Props rein, Mutationen (onSave/onStartEdit/onCancel) als
 * Callback-Props. Es wird KEIN lokaler State gehalten (Toggle-Hoheit liegt beim
 * komponierenden DetailsTabContent). 7× inline style → Tailwind-v4-Tokens gehoben.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title - Sektionstitel (Mono-Caps)
 * @param {React.ReactNode} [props.indicator] - kleiner Indikator neben dem Titel
 * @param {React.ReactNode} [props.headerRight] - Header-Slot rechts (vor Edit-Button)
 * @param {boolean} [props.editing=false] - Edit-Modus aktiv (Read vs. Edit)
 * @param {() => void} [props.onStartEdit] - Edit-Modus starten (Pencil-Klick)
 * @param {() => void} [props.onSave] - Speichern-Callback
 * @param {() => void} [props.onCancel] - Abbrechen-Callback
 * @param {boolean} [props.saving=false] - Speichern-Pending (disabled + Label)
 * @param {string} [props.error] - Fehlertext unter dem Edit-Body
 * @param {React.ReactNode} [props.children] - Read-Body (wenn nicht editing)
 * @param {() => React.ReactNode} [props.renderEdit] - Edit-Body-Renderer (wenn editing)
 * @param {boolean} [props.dirty] - reserviert (Dirty-Flag, vom Parent verwaltet)
 * @param {(d: boolean) => void} [props.onDirtyChange] - reserviert (Dirty-Callback)
 * @param {'card'|'plain'} [props.surface='card'] - 'card' = eigene Surface0-Fläche (Default,
 *   unverändert); 'plain' = randlos/flächenlos (kein bg/rounded/mb, reduzierte Insets) — für
 *   Einbettung in eine umschließende Common-Region (z.B. ContentBlock-Cohesion-Varianten),
 *   damit gestapelte Sektionen als EIN Block wahrgenommen werden statt als zwei Karten.
 * @param {string} [props.dataUiScope='editable-section'] - parametrisierter data-ui-Wurzelbereich (I03/D01)
 */
export default function EditableSection({
  title,
  indicator,
  headerRight,
  editing = false,
  onStartEdit,
  onSave,
  onCancel,
  saving = false,
  error,
  children,
  renderEdit,
  // dirty/onDirtyChange: vom Parent verwaltet, hier reserviert (noch nicht verdrahtet)
  dirty: _dirty,
  onDirtyChange: _onDirtyChange,
  surface = 'card',
  dataUiScope = 'editable-section',
}) {
  const plain = surface === 'plain'
  const rootCls = plain ? '' : 'rounded-xl mb-3 bg-[var(--surface0)]'
  const headerCls = plain ? 'flex items-center gap-2 pb-1' : 'flex items-center gap-2 px-4 pt-3 pb-2'
  const bodyCls = plain ? '' : 'px-4 pb-4'
  return (
    <div className={rootCls} data-ui={dataUiScope}>
      <div className={headerCls}>
        <h3 className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-2 text-[var(--subtext0)]">
          {title}
          {indicator}
        </h3>
        <div className="ml-auto flex items-center gap-1.5">
          {headerRight}
          {!editing && onStartEdit && (
            <IconButton
              icon={<Pencil size={13} />}
              onClick={onStartEdit}
              data-ui={`${dataUiScope}.edit`}
              label={`${title} bearbeiten`}
              size="sm"
              variant="ghost"
            />
          )}
        </div>
      </div>
      <div className={bodyCls}>
        {editing ? (
          <>
            {renderEdit?.()}
            {error && <p className="text-xs mt-2 text-[var(--accent-danger)]" data-ui={`${dataUiScope}.error`}>{error}</p>}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[var(--surface1)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={saving}
                data-ui={`${dataUiScope}.cancel`}
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onSave}
                loading={saving}
                data-ui={`${dataUiScope}.save`}
              >
                {saving ? 'Speichern…' : 'Speichern'}
              </Button>
            </div>
          </>
        ) : children}
      </div>
    </div>
  )
}
