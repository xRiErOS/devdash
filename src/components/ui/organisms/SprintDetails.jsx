/**
 * SprintDetails — Organism (06.60 Entity Details). Sprint-Variante der EntityDetail V2:
 * 2:1-Accordion-Voll-Komposition über den Spalten-Vertrag (D-C): L=Inhalt/Listen,
 * R=Meta/Status/Steuerung. Verdrahtet die WidgetBase-Organismen über die kanonischen
 * `entity-detail.slot.*`-Anker (Governance = Slot-Ref-Test, code-only).
 *
 * Slot-Map 2a: Sektion 01 (content/meta · notes/actions), Sektion 02 Span-Left
 * (children L breit · review/tags/activity R gestapelt, D-D). Fortschritt in `meta`
 * gefaltet (kein eigener progress-Slot, D-C). Präsentational/controlled — Fixtures bis
 * Live-Cutover (D-F); reale Tags/Activity/Review-Metrik = Wave D (T04/T05, D-L).
 *
 * @param {object} props
 * @param {object} [props.data] - { id, title, goal, status, capacity, goalBlocks, notes,
 *   meta[[label,value]], transitions[{key,label,variant?}], issues[{key,label,status?}],
 *   reviewMetrics{open,passed,rejected}, tags[{value,label,color}], tagOptions[],
 *   activity[{id,action,timestamp,agent_id}], onNavigate, onOpenReview }.
 */
import EntityDetailBase from './EntityDetailBase.jsx'
import ContentBlock from './ContentBlock.jsx'
import MetaDataWidget from './MetaDataWidget.jsx'
import TransitionActionsWidget from './TransitionActionsWidget.jsx'
import SprintReviewRollup from './SprintReviewRollup.jsx'
import EntityTags from './EntityTags.jsx'
import ChildrenWidget from './ChildrenWidget.jsx'
import ActivityList from './ActivityList.jsx'

const noop = () => {}

export default function SprintDetails({ data = {}, ...rest }) {
  const header = {
    id: data.id, title: data.title, goal: data.goal,
    pills: [
      { k: 'status', value: data.status ?? '—', tone: 'blue' },
      { k: 'type', value: 'sprint', tone: 'mauve' },
      { k: 'cap', value: data.capacity ?? '—', tone: 'teal' },
    ],
  }
  const sections = [
    {
      id: 'details', no: '01', title: 'Sprint Details', hint: 'Ziel & Notizen · Metadaten · Aktionen', defaultOpen: true,
      rows: [
        {
          left: { title: null, content: <ContentBlock heading="Ziel" blocks={data.goalBlocks ?? []} onEdit={noop} showBlockLabels={false} dataUiScope="sprint-goal-block" emptyPlaceholder="Kein Ziel hinterlegt." />, anchor: 'entity-detail.slot.content' },
          right: { title: null, content: <MetaDataWidget heading="Metadaten" rows={data.meta ?? []} onEdit={noop} onCopyForAi={noop} />, anchor: 'entity-detail.slot.meta' },
        },
        {
          left: { title: null, content: <ContentBlock heading="Notizen" blocks={data.notes ?? []} onEdit={noop} showBlockLabels={false} dataUiScope="sprint-notes-block" emptyPlaceholder="Keine Notizen." />, anchor: 'entity-detail.slot.notes' },
          right: { title: null, content: <TransitionActionsWidget heading="Status & Aktionen" transitions={data.transitions ?? []} onTransition={noop} />, anchor: 'entity-detail.slot.actions' },
        },
      ],
    },
    {
      id: 'issues', no: '02', title: 'Issues & Verlauf', hint: 'Issues · Review · Aktivität',
      rows: [
        {
          // Span-Left (Issue-Muster, rights stapeln N): children breit links, Review/Tags/Aktivität rechts gestapelt (D-D)
          left: { title: null, content: <ChildrenWidget heading="Issues" childLabel="Issues" items={data.issues ?? []} onNavigate={data.onNavigate ?? noop} />, anchor: 'entity-detail.slot.children' },
          rights: [
            { title: null, content: <SprintReviewRollup heading="Review" metrics={data.reviewMetrics ?? {}} onOpenReview={data.onOpenReview ?? noop} />, anchor: 'entity-detail.slot.review' },
            { title: null, content: <EntityTags heading="Tags" tags={data.tags ?? []} options={data.tagOptions ?? []} onRemove={noop} onAssign={noop} onCreate={noop} onStartAdd={noop} onCancelAdd={noop} />, anchor: 'entity-detail.slot.tags' },
            { title: null, content: <ActivityList heading="Aktivität" activity={data.activity ?? []} />, anchor: 'entity-detail.slot.activitylog' },
          ],
        },
      ],
    },
  ]
  return <EntityDetailBase header={header} sections={sections} {...rest} />
}
