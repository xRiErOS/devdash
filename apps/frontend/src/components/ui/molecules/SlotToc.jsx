/**
 * SlotToc — DD-599 (M5c) Slot-Navigation am Seitenkopf (Grill D02).
 *
 * Inhaltsverzeichnis auf SLOT-Ebene: eine Direktsprung-Zeile je Slot/SOP, NICHT
 * auf Heading-Ebene innerhalb eines Slots. Geteilt von der SSTD-Slot-Seite
 * (SstdTab) und der SOP-Seite (GlobalSettings) — gleicher Nav-Vertrag, andere
 * Entität/Persistenz (D01).
 *
 * PRESENTATIONAL: kein fetch/Store/API. Der Sprung selbst ist nach außen gehoben
 * (`onJump(key)`) — der Konsument scrollt das Ziel-Element an (id-Anchor +
 * scrollIntoView), damit die Molecule ohne DOM-/Router-Kopplung testbar bleibt.
 *
 * @param {object} props
 * @param {Array<{key:string,title:string,readonly?:boolean}>} props.entries - Slot-/SOP-Liste in Anzeige-Reihenfolge
 * @param {string} props.label - Überschrift der TOC (z.B. "SSTD — Slots", "SOPs")
 * @param {(key:string)=>void} [props.onJump] - Sprung zum Slot mit diesem key
 * @param {string} [props.dataUiScope='detail.slot-nav'] - data-ui-Wurzel (toc / toc.item.<key>)
 * @param {string} [props.tocId] - DOM-id der TOC (Sprungziel der „↑ Navigation"-Anker)
 * @param {string} [props.className]
 */

import { List, Lock, ChevronRight } from 'lucide-react'
import Stack from '../layout/Stack.jsx'
import Cluster from '../layout/Cluster.jsx'

export default function SlotToc({
  entries = [],
  label,
  onJump,
  dataUiScope = 'detail.slot-nav',
  tocId,
  className = '',
}) {
  return (
    <Stack gap="sm" className={className}>
      <Cluster gap="sm" className="flex-nowrap">
        <List size={14} className="text-[var(--subtext0)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--subtext0)]">{label}</span>
      </Cluster>
      <div
        id={tocId}
        className="flex flex-col gap-1 rounded-md border border-[var(--surface1)] bg-[var(--mantle)] p-1.5 scroll-mt-4"
        data-ui={`${dataUiScope}.toc`}
      >
        {entries.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => onJump?.(e.key)}
            className="flex w-full items-center justify-between gap-2 min-h-[44px] rounded px-2 text-left hover:bg-[var(--surface0)]"
            data-ui={`${dataUiScope}.toc.item.${e.key}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-[var(--text)]">{e.title}</span>
              {e.readonly && <Lock size={11} className="shrink-0 text-[var(--subtext0)]" aria-hidden="true" />}
            </span>
            <ChevronRight size={14} className="shrink-0 text-[var(--subtext0)]" />
          </button>
        ))}
      </div>
    </Stack>
  )
}
