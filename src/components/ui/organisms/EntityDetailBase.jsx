/**
 * EntityDetailBase — Organism (05.70 EntityDetails). Präsentationale Terminal-Shell
 * der EntityDetail-V2-Neugestaltung (PO 2026-06-19): Read-Only-Header (id + title +
 * MetaTag-Pills rechtsbündig + DocstringBlock-Goal) und eine AccordionSection-Liste,
 * je Sektion ein 2:1-Layout (links Text-Widgets, rechts Metadaten).
 *
 * ENTITY-AGNOSTISCH: die konkreten Entitäten (IssueDetails/SprintDetails/
 * MilestoneDetails/MemoryDetails) komponieren diese Base und liefern `header` +
 * `sections[].left/side` als Inhalt. So bleiben punktuelle Änderungen je Entität lokal
 * (PO-Entscheid). Die Base besitzt nur den Akkordeon-State (D04, Organismus-Ebene).
 *
 * @param {object} props
 * @param {{id: import('react').ReactNode, title: import('react').ReactNode, goal?: import('react').ReactNode, pills?: Array<{k: string, label?: string, value: import('react').ReactNode, tone?: string}>}} props.header
 * @param {Array<{id: string, no: string, title: import('react').ReactNode, hint?: import('react').ReactNode, rows?: Array<{left?: any, right?: any}>, defaultOpen?: boolean}>} [props.sections]
 *   - jede Sektion liefert AccordionBody-`rows` (Slots = { title, content }; Titel zentral).
 * @param {string} [props.className]
 */
import { useState } from 'react'
import EntityDetailHeader from '../molecules/EntityDetailHeader.jsx'
import AccordionSection from '../molecules/AccordionSection.jsx'
import AccordionBody from '../molecules/AccordionBody.jsx'

export default function EntityDetailBase({ header, sections = [], className = '', ...rest }) {
  const [open, setOpen] = useState(() => {
    const init = {}
    for (const s of sections) if (s.defaultOpen) init[s.id] = true
    return init
  })
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  return (
    <div data-ui="entity-detail-base" className={`w-full bg-[var(--layer-bg)] ${className}`} {...rest}>
      {/* Read-Only-Header als Molekül (GF-321: Chrome aus dem Organism ausgelagert). */}
      <EntityDetailHeader id={header.id} title={header.title} goal={header.goal} pills={header.pills} />

      {/* Akkordeon-Sektionen (ContentWrapper = Layer-2), je 2:1 (links Text · rechts Meta).
          GF-2 6-Ebenen-Canon: Accordion = --layer-2; die Widgets darin = --layer-3 (heben sich ab). */}
      <div className="mt-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--layer-2)]">
        {sections.map((s) => (
          <AccordionSection
            key={s.id}
            no={s.no}
            title={s.title}
            hint={s.hint}
            open={!!open[s.id]}
            onToggle={() => toggle(s.id)}
            panelId={`eb-${s.id}`}
          >
            <AccordionBody rows={s.rows} />
          </AccordionSection>
        ))}
      </div>
    </div>
  )
}
