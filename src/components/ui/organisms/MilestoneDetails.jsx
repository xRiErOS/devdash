/**
 * MilestoneDetails — Organism (06.60 Entity Details). Milestone-Variante der EntityDetail
 * V2: 2:1-Accordion-Voll-Komposition über den Spalten-Vertrag (D-C): L=Inhalt/Listen,
 * R=Meta/Status/Steuerung. Verdrahtet WidgetBase-Organismen über die kanonischen
 * `entity-detail.slot.*`-Anker (Governance = Slot-Ref-Test).
 *
 * Layout (PO 2026-06-21):
 *   AC[1] Milestone Details — R1: CL Beschreibung + DoD (gestapelt) | CR Metadaten ·
 *                             R2: CL Kontext | CR Status & Aktionen
 *   AC[2] Sprints & Verlauf — R1 Span-Left: CL Sprints | CR Abhängigkeiten · Tags · Aktivität
 *   (DoD ist in AC[1] R1 CL integriert — die frühere eigene Section 03 entfällt; dod bleibt
 *    L-Spalte, D-C-Vertrag intakt). Fortschritt in `meta` gefaltet (D-C).
 *
 * Präsentational/controlled — Fixtures bis Live-Cutover (D-F); Milestone-Deps sind
 * backend-real (`devd_milestone_dep_*`), Tags/Activity = Wave D (T04/T05).
 *
 * @param {object} props
 * @param {object} [props.data] - { id, title, goal, status, target, description, contextNotes,
 *   meta[[label,value]], transitions[{key,label,variant?}], sprints[{key,label,status?}],
 *   dependencies{predecessors[],successors[]}, tags[{value,label,color}], tagOptions[],
 *   activity[{id,action,timestamp,agent_id}], dod[{id,label,done,details}], onNavigate,
 *   onDodToggle, onDodCreate, onDodPatch }.
 */
import EntityDetailBase from './EntityDetailBase.jsx'
import ContentBlock from './ContentBlock.jsx'
import MetaDataWidget from './MetaDataWidget.jsx'
import TransitionActionsWidget from './TransitionActionsWidget.jsx'
import ChildrenWidget from './ChildrenWidget.jsx'
import DefinitionOfDoneWidget from './DefinitionOfDoneWidget.jsx'
import DependencyWidget from './DependencyWidget.jsx'
import EntityTags from './EntityTags.jsx'
import ActivityList from './ActivityList.jsx'

const noop = () => {}

export default function MilestoneDetails({ data = {}, ...rest }) {
  const header = {
    id: data.id, title: data.title, goal: data.goal,
    pills: [
      { k: 'status', value: data.status ?? '—', tone: 'blue' },
      { k: 'type', value: 'milestone', tone: 'mauve' },
      { k: 'target', value: data.target ?? '—', tone: 'teal' },
    ],
  }
  const deps = data.dependencies ?? {}
  const sections = [
    {
      id: 'details', no: '01', title: 'Milestone Details', hint: 'Beschreibung & DoD · Metadaten · Kontext · Aktionen', defaultOpen: true,
      rows: [
        {
          // CL: Beschreibung + DoD gestapelt (beide L-Spalte, D-C) | CR: Metadaten
          left: {
            title: null,
            content: (
              <div className="space-y-4">
                <div data-ui="entity-detail.slot.content">
                  <ContentBlock heading="Beschreibung" blocks={data.description ?? []} onEdit={noop} showBlockLabels={false} dataUiScope="milestone-desc-block" emptyPlaceholder="Keine Beschreibung." />
                </div>
                <div data-ui="entity-detail.slot.dod">
                  <DefinitionOfDoneWidget heading="DoD-Kriterien" items={data.dod ?? []} onToggle={data.onDodToggle ?? noop} onCreate={data.onDodCreate ?? noop} onPatch={data.onDodPatch ?? noop} />
                </div>
              </div>
            ),
          },
          right: { title: null, content: <MetaDataWidget heading="Metadaten" rows={data.meta ?? []} onEdit={noop} onCopyForAi={noop} />, anchor: 'entity-detail.slot.meta' },
        },
        {
          left: { title: null, content: <ContentBlock heading="Kontext" blocks={data.contextNotes ?? []} onEdit={noop} showBlockLabels={false} dataUiScope="milestone-context-block" emptyPlaceholder="Kein Kontext." />, anchor: 'entity-detail.slot.context' },
          right: { title: null, content: <TransitionActionsWidget heading="Status & Aktionen" transitions={data.transitions ?? []} onTransition={noop} />, anchor: 'entity-detail.slot.actions' },
        },
      ],
    },
    {
      id: 'sprints', no: '02', title: 'Sprints & Verlauf', hint: 'Sprints · Abhängigkeiten · Aktivität',
      rows: [
        {
          // Span-Left (rights stapeln N): Sprints breit links, Deps/Tags/Aktivität rechts gestapelt (D-D)
          left: { title: null, content: <ChildrenWidget heading="Sprints" childLabel="Sprints" items={data.sprints ?? []} onNavigate={data.onNavigate ?? noop} />, anchor: 'entity-detail.slot.children' },
          rights: [
            { title: null, content: <DependencyWidget heading="Abhängigkeiten" title={null} predecessors={deps.predecessors ?? []} successors={deps.successors ?? []} onNavigate={noop} onAdd={noop} />, anchor: 'entity-detail.slot.deps' },
            { title: null, content: <EntityTags heading="Tags" tags={data.tags ?? []} options={data.tagOptions ?? []} onRemove={noop} onAssign={noop} onCreate={noop} onStartAdd={noop} onCancelAdd={noop} />, anchor: 'entity-detail.slot.tags' },
            { title: null, content: <ActivityList heading="Aktivität" activity={data.activity ?? []} />, anchor: 'entity-detail.slot.activitylog' },
          ],
        },
      ],
    },
  ]
  return <EntityDetailBase header={header} sections={sections} {...rest} />
}
