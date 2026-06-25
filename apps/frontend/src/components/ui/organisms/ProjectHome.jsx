import { useState } from 'react'
import AccordionSection from '../molecules/AccordionSection.jsx'
import AccordionBody from '../molecules/AccordionBody.jsx'
import WidgetBase from './WidgetBase.jsx'
import MetaDataWidget from './MetaDataWidget.jsx'
import ContentBlock from './ContentBlock.jsx'
import ChildrenWidget from './ChildrenWidget.jsx'
import ActiveEntityCard from '../molecules/ActiveEntityCard.jsx'
import TodoWidget from './TodoWidget.jsx'

const noop = () => {}

/**
 * ProjectHome — EntityDetailBase-Recipe-Komposition (D-A) für den Projekt-Übersichts-Tab.
 * Layer-2-Region umschließt die Accordion-Slots; Widgets darin = Layer-3 (heben sich ab).
 * Eigener project-home.slot.* data-ui-Namespace (D2). Präsentational; S1: Meta+Copy · Ziel ·
 * Prio-1-Backlog · aktiver Meilenstein/Sprint. ToDo/SSTD/SessionNotes = Platzhalter (S2).
 */
export default function ProjectHome({
  project: _project = {},
  meta = [],
  goalBlocks = [],
  activeMilestone = null,
  activeSprint = null,
  priorityBacklog = [],
  todos = [],
  onCopyMeta = noop,
  onNavigate = noop,
  onTodoToggle = noop,
  onTodoAdd = noop,
  onTodoCopyId = noop,
  onTodoAssignTag = noop,
  dataUi = 'project-home',
}) {
  const [open, setOpen] = useState({ s1: true, s2: true, s3: false })
  const [msOpen, setMsOpen] = useState(true)
  const [spOpen, setSpOpen] = useState(true)
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  const milestoneCard = activeMilestone ? (
    <ActiveEntityCard {...activeMilestone} dataUi="active-milestone" open={msOpen} onToggle={() => setMsOpen((v) => !v)} />
  ) : (
    <WidgetBase heading="Aktiver Meilenstein" dataUi="active-milestone"><p className="text-[var(--subtext0)] text-sm">Kein aktiver Meilenstein.</p></WidgetBase>
  )
  const sprintCard = activeSprint ? (
    <ActiveEntityCard {...activeSprint} dataUi="active-sprint" open={spOpen} onToggle={() => setSpOpen((v) => !v)} />
  ) : (
    <WidgetBase heading="Aktiver Sprint" dataUi="active-sprint"><p className="text-[var(--subtext0)] text-sm">Kein aktiver Sprint.</p></WidgetBase>
  )
  const activeStack = (
    <div className="flex flex-col gap-2">{milestoneCard}{sprintCard}</div>
  )

  return (
    <div data-ui={dataUi} className="flex flex-col gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--layer-2)] p-2">
      <AccordionSection no="01" title="Übersicht" open={open.s1} onToggle={() => toggle('s1')} panelId={`${dataUi}-s1`}>
        <AccordionBody rows={[{
          left: { title: null, content: <ContentBlock heading="Ziel & Beschreibung" blocks={goalBlocks} onEdit={noop} showBlockLabels={false} dataUiScope="project-goal-block" emptyPlaceholder="Kein Ziel hinterlegt." />, anchor: 'project-home.slot.content' },
          right: { title: null, content: <MetaDataWidget heading="Metadaten" rows={meta} onEdit={noop} onCopyForAi={onCopyMeta} />, anchor: 'project-home.slot.meta' },
        }]} />
      </AccordionSection>

      <AccordionSection no="02" title="Aktiv" open={open.s2} onToggle={() => toggle('s2')} panelId={`${dataUi}-s2`}>
        <AccordionBody rows={[{
          left: { title: null, content: <ChildrenWidget heading="Prio-1 Backlog" childLabel="Issues" items={priorityBacklog} onNavigate={onNavigate} />, anchor: 'project-home.slot.backlog' },
          right: { title: null, content: activeStack, anchor: 'project-home.slot.active' },
        }]} />
      </AccordionSection>

      {/* SSTD + SessionNotes raus (PO-R2 / S2-D1): beide haben eigene ProjectPages-Tabs → in ProjectHome redundant.
          S2: ToDos-Platzhalter durch echtes TodoWidget ersetzt (project-home.slot.todos). */}
      <AccordionSection no="03" title="Arbeit" open={open.s3} onToggle={() => toggle('s3')} panelId={`${dataUi}-s3`}>
        <AccordionBody rows={[{
          left: { title: null, content: <TodoWidget todos={todos} onToggle={onTodoToggle} onAdd={onTodoAdd} onCopyId={onTodoCopyId} onAssignTag={onTodoAssignTag} />, anchor: 'project-home.slot.todos' },
        }]} />
      </AccordionSection>
    </div>
  )
}
