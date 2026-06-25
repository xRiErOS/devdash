import { useState } from 'react'
import { Plus } from 'lucide-react'
import CaptureWidget from '../molecules/CaptureWidget.jsx'
import DoDItem from '../molecules/DoDItem.jsx'
import IconButton from '../atoms/IconButton.jsx'
import WidgetBase from './WidgetBase.jsx'
import DefinitionOfDoneForm from './DefinitionOfDoneForm.jsx'

/**
 * DefinitionOfDoneWidget — Organism (V2-Rewrite, D09 In-Place · WidgetBase E1 Gruppe 4, Q-B 🟢).
 * Titellose DoD-Checkliste eines Milestones: WidgetBase-Shell (Layer-3-Fill + Border + Radius,
 * EINZIGE Fill-Quelle der Widget-Schicht) komponiert CaptureWidget (präsentationale Erfass-
 * Shell, randlos) mit DoDItem-Zeilen im body, Erfassen-IconButton im create-Slot und der
 * Fortschritts-Metrik unten-rechts. Default titellos: WidgetBase ohne `heading` rendert nur
 * den Content — der Titel kommt zentral aus dem AccordionBody-Slot (D02). `heading` ist opt-in
 * (T7/Wave-4): gesetzt → eine self-titled WidgetHeading (Dot + --heading-accent, kein //-Slash)
 * über dem Content. Terminal-Token-Sprache (Mono via WidgetBase className).
 *
 * Erfassen (Req 3) und der Detail-Drill je Item (dod-item.detail, Req 6) öffnen dasselbe
 * DefinitionOfDoneForm-Modal — Öffnen/Schließen ist interner UI-State; die Persistenz läuft
 * über die gehobenen Callbacks onToggle/onCreate/onPatch. data-ui-Scopes `dod-widget` +
 * `dod-widget.progress` bleiben stabil (Content-Identität, Req 7); das Form-Modal bleibt
 * Sibling der Shell (Overlay, nicht Widget-Content).
 *
 * @param {object} props
 * @param {Array<{id?:number, key?:string, label:import('react').ReactNode, done?:0|1|boolean, checked?:boolean, details?:string}>} [props.items]
 * @param {(id:(number|string), e:any)=>void} [props.onToggle] - Checkbox-Toggle je Item.
 * @param {(label:string, details?:string)=>(void|Promise<void>)} [props.onCreate] - neues Kriterium.
 * @param {(id:number, patch:{label?:string,details?:string,done?:0|1})=>(void|Promise<void>)} [props.onPatch] - Item-Patch.
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.framed=false] - Rahmen + Tönung der inneren CaptureWidget-Liste (Standalone); im Accordion-Slot randlos.
 * @param {import('react').ReactNode} [props.heading] - opt-in Slot-Heading (WidgetBase WidgetHeading); fehlt → titellos (D02).
 * @param {import('react').ReactNode} [props.emptyHint='Noch keine DoD-Kriterien.']
 * @param {string} [props.className]
 */
export default function DefinitionOfDoneWidget({
  items = [],
  onToggle,
  onCreate,
  onPatch,
  disabled = false,
  framed = false,
  heading,
  emptyHint = 'Noch keine DoD-Kriterien.',
  className = '',
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const keyOf = (item) => item.key ?? item.id
  const isDone = (item) => Boolean(item.checked ?? item.done)
  const doneCount = items.filter(isDone).length

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (item) => { setEditing(item); setFormOpen(true) }
  const closeForm = () => setFormOpen(false)

  const createBtn = (
    <IconButton
      icon={<Plus size={16} aria-hidden="true" />}
      label="DoD-Kriterium erfassen"
      onClick={openCreate}
      disabled={disabled}
      size="sm"
      variant="ghost"
      reveal
      data-ui="dod-widget.create"
    />
  )

  const progress = (
    <span data-ui="dod-widget.progress" className="tabular-nums">
      {doneCount}/{items.length} erfüllt
    </span>
  )

  return (
    <>
      <WidgetBase
        heading={heading}
        dataUi="dod-widget"
        className={`[font-family:var(--font-display)] ${className}`}
      >
        <CaptureWidget framed={framed} createSlot={createBtn} metrics={[progress]}>
          {items.length === 0 ? (
            <p data-ui="dod-widget.empty-hint" className="text-[12px] text-[var(--subtext0)]">
              {emptyHint}
            </p>
          ) : (
            <div>
              {items.map((item) => (
                <DoDItem
                  key={keyOf(item)}
                  checked={isDone(item)}
                  onToggle={(e) => onToggle?.(keyOf(item), e)}
                  onDetail={() => openEdit(item)}
                  disabled={disabled}
                  data-ui={`dod-widget.item-${keyOf(item)}`}
                >
                  {item.label}
                </DoDItem>
              ))}
            </div>
          )}
        </CaptureWidget>
      </WidgetBase>

      <DefinitionOfDoneForm
        open={formOpen}
        onClose={closeForm}
        item={editing}
        onCreate={onCreate}
        onPatch={onPatch}
      />
    </>
  )
}
