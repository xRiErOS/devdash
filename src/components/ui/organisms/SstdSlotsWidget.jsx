import { useState } from 'react'
import WidgetBase from './WidgetBase.jsx'
import AccordionSection from '../molecules/AccordionSection.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import { renderMarkdown } from '../../../lib/markdown.js'

// Default-Offen: sprint_state (aktueller Arbeitsstand zuerst sichtbar), Rest zu.
const DEFAULT_OPEN_KEY = 'sprint_state'

/**
 * SstdSlotsWidget — präsentationales, READ-ONLY ProjectPages-Widget (GF-2 S2 T3).
 * Rendert die 6 SSTD-Prosa-Slots (architecture/conventions/sprint_state/roadmap/
 * cross_refs/misc) + die Journal-Projektion als Terminal-Accordion (AccordionSection,
 * je Slot collapsible). KEINE Edit-Controls — Editieren läuft über den eigenen
 * SSTD-Tab/SlotSection, nicht hier (D-R2: ProjectHome-Übersicht ist read-only).
 *
 * PRESENTATIONAL: kein Store/Fetch. State = nur ephemerer Open/Zu-Umschalter.
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,contentMd?:string}>} [props.slots=[]] - 6 SSTD-Slots
 * @param {string[]} [props.journal=[]] - Journal-Projektion (read-only, neueste zuerst)
 * @param {string} [props.heading='SSTD']
 * @param {string} [props.dataUi='sstd-slots']
 */
export default function SstdSlotsWidget({
  slots = [],
  journal = [],
  heading = 'SSTD',
  dataUi = 'sstd-slots',
}) {
  const [open, setOpen] = useState(() => ({ [DEFAULT_OPEN_KEY]: true }))
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  return (
    <WidgetBase heading={heading} dataUi={dataUi}>
      {/* Direkte Geschwister-Sections — AccordionSection-Keyboard-Nav (↑/↓/Home/End)
          scannt closest('[data-ui="accordion-section"]').parentElement.children. */}
      <div>
        {slots.map((s, i) => {
          const slotUi = `${dataUi}.slot-${s.key}`
          const no = String(i + 1).padStart(2, '0')
          return (
            <AccordionSection
              key={s.key}
              no={no}
              title={s.label}
              open={!!open[s.key]}
              onToggle={() => toggle(s.key)}
              panelId={`${dataUi}-${s.key}`}
              data-slot-key={s.key}
            >
              {s.contentMd ? (
                <div
                  data-ui={slotUi}
                  data-slot-key={s.key}
                  className="px-2 py-3 text-sm leading-relaxed text-[var(--text)]"
                  // renderMarkdown = reiner read-only Formatter (lib/markdown.js, wie SlotSection).
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(s.contentMd) }}
                />
              ) : (
                <p data-ui={`${slotUi}.empty`} data-slot-key={s.key} className="px-2 py-3 text-sm italic text-[var(--subtext0)]">
                  leer
                </p>
              )}
            </AccordionSection>
          )
        })}

        <AccordionSection
          no={String(slots.length + 1).padStart(2, '0')}
          title="Journal"
          open={!!open.__journal}
          onToggle={() => toggle('__journal')}
          panelId={`${dataUi}-journal`}
          hint="read-only Projektion"
        >
          <div data-ui={`${dataUi}.journal`} className="flex flex-col gap-1 px-2 py-3">
            {journal.length === 0 ? (
              <EmptyState size="sm" icon={<Icon name="history" size={18} mono />} title="Kein Journal." />
            ) : (
              journal.map((entry, i) => (
                <p
                  key={i}
                  data-ui={`${dataUi}.journal.item-${i}`}
                  className="border-s-2 border-[var(--surface2)] ps-2 text-sm text-[var(--subtext1)]"
                >
                  {entry}
                </p>
              ))
            )}
          </div>
        </AccordionSection>
      </div>
    </WidgetBase>
  )
}
