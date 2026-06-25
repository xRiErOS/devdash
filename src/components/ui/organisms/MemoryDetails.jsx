/**
 * MemoryDetails — Organism (05.70 EntityDetails). Memory-Variante der EntityDetail V2
 * (vollwertige Entität, PO 2026-06-19). Header (category/anchor/status) + Sektionen
 * Inhalt · Beziehungen · Verlauf — abgeleitet aus dem project_memories-Modell
 * (category, anchor-Code z.B. D01, supersede-Kette, cross-refs). Memory ist Blatt-Entität:
 * emittiert nur die in-scope-Slots content · meta (EntityDetailSlotMap-Vertrag, GF-419/T06;
 * kein children/deps/relctx). Platzhalter (D01).
 *
 * @param {object} props
 * @param {{id, title, category, anchor, status, meta, relations, history}} [props.data]
 */
import EntityDetailBase from './EntityDetailBase.jsx'
import PlaceholderField from './PlaceholderField.jsx'
import MetaDataWidget from './MetaDataWidget.jsx'

export default function MemoryDetails({ data = {}, ...rest }) {
  const header = {
    id: data.id,
    title: data.title,
    // Memory hat KEIN Goal — kein Untertitel (PO-#2/D02). Bewusst nicht gesetzt.
    pills: [
      { k: 'category', value: data.category ?? 'architecture_decision', tone: 'mauve' },
      { k: 'anchor', value: data.anchor ?? 'D01', tone: 'peach' },
      { k: 'status', value: data.status ?? 'active', tone: 'blue' },
    ],
  }
  const sections = [
    {
      id: 'content', no: '01', title: 'Inhalt', hint: 'Memory-Text & Rationale + Metadaten', defaultOpen: true,
      rows: [
        { left: { title: null, content: <PlaceholderField lines={6} heading="Memory-Text" />, anchor: 'entity-detail.slot.content' }, right: { title: null, content: <MetaDataWidget heading="Metadaten" rows={data.meta ?? []} />, anchor: 'entity-detail.slot.meta' } },
        { left: { title: null, content: <PlaceholderField lines={3} heading="Rationale" /> } },
      ],
    },
    {
      id: 'relations', no: '02', title: 'Beziehungen', hint: 'verwandte Memories · Cross-Refs · Supersede-Kette',
      rows: [
        { left: { title: null, content: <PlaceholderField lines={4} heading="Verwandte Memories" /> }, right: { title: null, content: <MetaDataWidget heading="Cross-Refs" rows={data.relations ?? []} /> } },
        { left: { title: null, content: <PlaceholderField lines={2} heading="Supersede-Kette" /> } },
      ],
    },
    {
      id: 'history', no: '03', title: 'Verlauf', hint: 'Revisionen',
      rows: [
        { left: { title: null, content: <PlaceholderField lines={4} heading="Revisionen" /> }, right: { title: null, content: <MetaDataWidget heading="Zeitachse" rows={data.history ?? []} /> } },
      ],
    },
  ]
  return <EntityDetailBase header={header} sections={sections} {...rest} />
}
