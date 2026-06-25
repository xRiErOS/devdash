/**
 * IssueDetails — Organism (05.70 EntityDetails). Issue-Variante der EntityDetail V2:
 * Voll-Komposition (PO 2026-06-20) — verdrahtet ALLE vorhandenen 05.30-Organismen in
 * das EntityDetailBase-Gerüst mit kanonischen entity-detail.slot.*-Ankern je Scope.
 * Referenzfall für ReviewFlow/Sprint/MilestoneDetails (Forward-Plan §7).
 *
 * Layout (D01/D04-D07):
 *  - Header: Pills (prio/status/type). HierarchyTrail (archiviert) entfernt (PO-#1).
 *  - 01 Issue Details: Beschreibung·ContentBlock (slot.content) / Metadaten·MetaDataWidget
 *    (slot.meta); PO-Notes·ContentBlock (slot.ponotes) / Status & Aktionen·
 *    TransitionActionsWidget (slot.actions); Kontext·ContentBlock (slot.context) /
 *    Review·ReviewsTabContent (slot.review).
 *  - 02 Relations & Attachments: Span-Left-Reihe (T4.8) — User Stories·UserStoriesWidget
 *    headless (slot.children, Issue-Spezialisierung D02 — KEIN ChildrenWidget) spannt
 *    links über zwei rechte Reihen: Tags·EntityTags (slot.tags, PO-#4.9 nur "Tags") oben,
 *    Abhängigkeiten·DependencyWidget (slot.deps, PO-#4.8a) unten; danach normale Reihe
 *    Anhänge & Memories·AttachmentsAndMemories (slot.relctx) / Aktivität·ActivityList
 *    (slot.activitylog, D06-Swap).
 *
 * Präsentational/controlled: liest `data.*`, Affordanz-Callbacks default noop (Showcase);
 * echte Handler wired die Page. Forms (ContentBlockForm/DependencyForm) sind Story-Sache (Req-5).
 *
 * @param {object} props
 * @param {object} [props.data] - siehe Slot-Felder oben (description/poNotes/contextNotes
 *   /meta/transitions/reviews/dependencies/tags/tagOptions/userStories/attachments/files
 *   /memories/activity).
 */
import EntityDetailBase from './EntityDetailBase.jsx'
import ContentBlock from './ContentBlock.jsx'
import MetaDataWidget from './MetaDataWidget.jsx'
import TransitionActionsWidget from './TransitionActionsWidget.jsx'
import ReviewsTabContent from './ReviewsTabContent.jsx'
import DependencyWidget from './DependencyWidget.jsx'
import EntityTags from './EntityTags.jsx'
import UserStoriesWidget from './UserStoriesWidget.jsx'
import AttachmentsAndMemories from './AttachmentsAndMemories.jsx'
import ActivityList from './ActivityList.jsx'

const noop = () => {}

export default function IssueDetails({ data = {}, onEdit = noop, onCopyMeta = noop, onTransition = noop, ...rest }) {
  const header = {
    id: data.id,
    title: data.title,
    goal: data.goal,
    pills: [
      { k: 'prio', value: data.priority ?? '—', tone: 'peach' },
      { k: 'status', value: data.status ?? '—', tone: 'blue' },
      { k: 'type', value: data.type ?? 'feature', tone: 'mauve' },
    ],
  }

  const deps = data.dependencies ?? {}

  const sections = [
    {
      id: 'details', no: '01', title: 'Issue Details', hint: 'Beschreibung, PO-Notes & Kontext · Metadaten · Aktionen · Review', defaultOpen: true,
      rows: [
        {
          left: { title: null, content: <ContentBlock heading="Beschreibung" blocks={data.description ?? []} onEdit={onEdit} />, anchor: 'entity-detail.slot.content' },
          right: { title: null, content: <MetaDataWidget heading="Metadaten" rows={data.meta ?? []} onEdit={onEdit} onCopyForAi={onCopyMeta} />, anchor: 'entity-detail.slot.meta' },
        },
        {
          left: { title: null, content: <ContentBlock heading="PO-Notes" blocks={data.poNotes ?? []} onEdit={onEdit} showBlockLabels={false} dataUiScope="po-notes-block" emptyPlaceholder="Keine PO-Notes." />, anchor: 'entity-detail.slot.ponotes' },
          right: { title: null, content: <TransitionActionsWidget heading="Status & Aktionen" transitions={data.transitions ?? []} showTitle={false} onTransition={onTransition} emptyHint="Keine Übergänge verfügbar." />, anchor: 'entity-detail.slot.actions' },
        },
        {
          // Kontext: read-only (context_notes nicht im IssueForm-Feld-Scope, D04-analog) → kein Pencil.
          left: { title: null, content: <ContentBlock heading="Kontext" blocks={data.contextNotes ?? []} showBlockLabels={false} dataUiScope="context-block" emptyPlaceholder="Kein Kontext hinterlegt." />, anchor: 'entity-detail.slot.context' },
          // Review: read-only Anzeige (Create/Select-Round = undokumentiert, kein Backend-Handler in der Backlog-Pane).
          right: { title: null, content: <ReviewsTabContent heading="Review" reviews={data.reviews ?? []} />, anchor: 'entity-detail.slot.review' },
        },
      ],
    },
    {
      id: 'relations', no: '02', title: 'Relations & Attachments', hint: 'User Stories · Tags · Abhängigkeiten · Anhänge & Memories · Aktivität',
      rows: [
        {
          // Span-Left (PO-#4.8b): User Stories links über zwei rechte Reihen; rechts
          // Tags oben (PO-#4.9 nur "Tags"), Abhängigkeiten darunter (PO-#4.8a).
          // READ-ONLY-Anzeige in der Backlog-Pane: User Stories / Tags / Dependencies /
          // Attachments / Memories haben (noch) KEINEN Backend-Handler (undokumentiert,
          // Folge-Sprint) → KEINE Edit-/Add-Affordanzen (keine toten Buttons). Bei späterer
          // Verdrahtung Callbacks als Props ergänzen.
          left: { title: null, content: <UserStoriesWidget heading="User Stories" stories={data.userStories ?? []} showTitle={false} bordered={false} filterDefault="all" />, anchor: 'entity-detail.slot.children' },
          rights: [
            { title: null, content: <EntityTags heading="Tags" tags={data.tags ?? []} options={data.tagOptions ?? []} showTitle={false} />, anchor: 'entity-detail.slot.tags' },
            { title: null, content: <DependencyWidget heading="Abhängigkeiten" title={null} predecessors={deps.predecessors ?? []} successors={deps.successors ?? []} />, anchor: 'entity-detail.slot.deps' },
          ],
        },
        {
          left: { title: null, content: <AttachmentsAndMemories heading="Anhänge & Memories" attachments={data.attachments ?? []} files={data.files ?? []} memories={data.memories ?? []} />, anchor: 'entity-detail.slot.relctx' },
          right: { title: null, content: <ActivityList heading="Aktivität" activity={data.activity ?? []} />, anchor: 'entity-detail.slot.activitylog' },
        },
      ],
    },
  ]
  return <EntityDetailBase header={header} sections={sections} {...rest} />
}
