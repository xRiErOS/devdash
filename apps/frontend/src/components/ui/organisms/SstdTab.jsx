// DD-361 (DD#49): SSTD-Tab — die 6 SSTD-Slots als EINZELN editierbare Sektionen (Whole-Slot-Save
// gegen die MEM#6-Slot-REST, last-write-wins) statt nur read-only reassemblierter Blob. Plus die
// beiden read-only Projektionen (Nächste Schritte ← offene ToDos; Journal ← session_notes), die
// NICHT editierbar sind. Markdown via renderMarkdown (DD-362-Renderer).
//
// DD-546: Das frühere Sources-/„Quellen"-Panel (rechte Spalte) wurde entfernt — es ist nicht Teil
// der Storybook-SOLL. Die Slot-Karten füllen jetzt die volle Breite (Single-Column). Der
// Backend-Endpoint /api/projects/:id/sstd-sources bleibt bestehen (anderweitig potenziell genutzt),
// nur der Client-Fetch + das Panel sind hier weg.

import { useEffect, useState } from 'react'
import { Lock, Copy, Check, ArrowUp } from 'lucide-react'
import { renderMarkdown } from '../../../lib/markdown.js'
import useMediaQuery from '../../../hooks/useMediaQuery.js'
import useCopyFeedback from '../../../hooks/useCopyFeedback.js'
import { toast } from '../../../lib/toast.js'
import SlotSection from './SlotSection.jsx'
import SlotToc from '../molecules/SlotToc.jsx'
import SlotFullTextWindow from './SlotFullTextWindow.jsx'
import {
  getSstdSlots,
  setSstdSlot,
  getSstdProjections,
} from '../../../lib/projectHomeApi.js'

// DD-599 (M5c) — Slot-Navigation: Anker-Ziele + Sprung-Helfer (id-Anchor +
// scrollIntoView, guarded für SSR/env=node-Test).
const TOC_ID = 'sstd-slot-toc'
const slotDomId = (key) => `sstd-slot-${key}`
function scrollToId(id) {
  if (typeof document === 'undefined') return
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
// Style-Konstanten lokal definiert (DD-538-fix: OverviewTab exportiert diese nicht mehr;
// SstdTab ist Legacy-inline-style — kein Token-Umbau, nur Import-Bruch beseitigt).
const panelStyle = {
  background: 'var(--mantle)',
  border: '1px solid var(--surface0)',
  borderRadius: 10,
  padding: 'var(--space-4, 16px)',
  minHeight: 240,
}
const headingStyle = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text)',
  margin: '0 0 12px 0',
}
const hintStyle = {
  fontSize: 13,
  color: 'var(--subtext0)',
  margin: 0,
}

// Mirror von SLOT_TITLES / PROJECTION_TITLES aus server/lib/sstdSlots.js.
// Server-Module sind nicht client-importierbar — hier als Konstante gespiegelt.
// (Die Slot-Reihenfolge trägt jetzt SLOT_NAV_ORDER, DD-599.)
const SLOT_TITLES = {
  architecture: 'Architektur',
  conventions: 'Konventionen',
  sprint_state: 'Sprintlage',
  roadmap: 'Roadmap',
  cross_refs: 'Cross-Refs',
  misc: 'Sonstiges',
}
const PROJECTION_TITLES = {
  next_steps: 'Nächste Schritte',
  journal: 'Journal',
}

// DD-599 (D02): TOC-/Render-Reihenfolge auf SLOT-Ebene — 6 Slots in Server-Reihenfolge
// plus die 2 read-only Projektionen an ihrer kanonischen Position (Nächste Schritte ←
// nach sprint_state, Journal ← am Ende).
const SLOT_NAV_ORDER = [
  { kind: 'slot', key: 'architecture' },
  { kind: 'slot', key: 'conventions' },
  { kind: 'slot', key: 'sprint_state' },
  { kind: 'projection', key: 'next_steps' },
  { kind: 'slot', key: 'roadmap' },
  { kind: 'slot', key: 'cross_refs' },
  { kind: 'slot', key: 'misc' },
  { kind: 'projection', key: 'journal' },
]
const SLOT_NAV_TITLES = { ...SLOT_TITLES, ...PROJECTION_TITLES }

// DD-500: Die lokale SlotSection wurde durch das kanonische
// ui/organisms/SlotSection ersetzt (Storybook = window on the same code). Die
// API-Mutation (setSstdSlot) + In-Flight/Error-State sind in den Screen gehoben
// (siehe SstdTab.handleSlotSave / slotMutations); der gate-kritische Wurzel-Anker
// `plugin.sstd.slot` wird via rootDataUi gesetzt (string-literal-Bindung unten).

// Read-only Projektion (Nächste Schritte / Journal) — kein Bearbeiten-Button, klar markiert.
// DD-599: nur noch der INNERE Inhalt (Card-Chrome + „↑ Navigation"-Anker liegen im
// Slot-Nav-Wrapper der SstdTab-Render-Schleife). Tokens via Tailwind (kein inline-style).
// clip+onExpand → mobile geclippte, antippbare Preview → Volltext-Fenster (read-only).
function ProjectionSection({ uiKey, title, content, clip = false, onExpand }) {
  return (
    <div data-ui={`project-home.tabs.sstd.projection.${uiKey}`}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="m-0 font-display text-[15px] font-bold text-[var(--text)] truncate">{title}</h3>
        <span
          className="inline-flex items-center gap-1 rounded-md border border-[var(--surface2)] px-2 py-0.5 text-[11px] text-[var(--subtext0)]"
          title="Wird automatisch generiert und ist nicht editierbar"
        >
          <Lock size={11} aria-hidden="true" />read-only
        </span>
      </div>
      {content ? (
        clip ? (
          <button
            type="button"
            onClick={onExpand}
            data-ui={`detail.slot-nav.slot.${uiKey}.clip`}
            className="relative block w-full text-left max-md:max-h-[40vh] max-md:overflow-hidden"
          >
            <div className="text-sm leading-relaxed text-[var(--text)]" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-10 max-md:block bg-gradient-to-t from-[var(--mantle)] to-transparent" aria-hidden="true" />
          </button>
        ) : (
          <div className="text-sm leading-relaxed text-[var(--text)]" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        )
      ) : (
        <p className="text-sm italic text-[var(--subtext0)]">leer</p>
      )}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SstdTab({ projectId }) {
  const [slots, setSlots] = useState([]) // [{slot_key, content, updated_at}]
  const [projections, setProjections] = useState({ next_steps: '', journal: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // DD-500: Per-Slot Mutations-State (In-Flight + Fehler). Die kanonische
  // SlotSection ist presentational; der Screen hält saving/error pro slot_key und
  // führt setSstdSlot aus (Mutation aus der Komponente gehoben).
  const [slotMutations, setSlotMutations] = useState({}) // { [slotKey]: { saving, error } }

  // DD-599 (D03): Clip + Volltext-Fenster sind die mobile (<768px) Variante; Desktop
  // behält vollen Inline-Inhalt + Inline-Edit. Conditional via useMediaQuery (SSR-
  // Default false = Desktop → Bestands-Markup unverändert).
  const isMobile = useMediaQuery('(max-width: 767px)', false)
  // DD-599 (D04): Volltext-Fenster-State. { key, title, body, mode } | null.
  const [slotWindow, setSlotWindow] = useState(null)
  const [windowMutation, setWindowMutation] = useState({ saving: false, error: '' })

  function openWindow(w) {
    setWindowMutation({ saving: false, error: '' })
    setSlotWindow(w)
  }
  function closeWindow() {
    setSlotWindow(null)
  }

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }
    let cancelled = false

    setLoading(true)
    setError('')
    Promise.all([getSstdSlots(projectId), getSstdProjections(projectId)])
      .then(([slotList, proj]) => {
        if (cancelled) return
        setSlots(Array.isArray(slotList) ? slotList : [])
        setProjections({ next_steps: proj?.next_steps || '', journal: proj?.journal || '' })
      })
      .catch((e) => { if (!cancelled) setError(e?.message || 'SSTD-Laden fehlgeschlagen') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [projectId])

  function handleSlotSaved(slotKey, content) {
    setSlots((prev) =>
      prev.map((s) => (s.slot_key === slotKey ? { ...s, content, updated_at: new Date().toISOString() } : s))
    )
  }

  // DD-500: gehobene Mutation für die kanonische SlotSection. Führt setSstdSlot
  // aus, hält saving/error pro slot und meldet Erfolg an handleSlotSaved (synct den
  // Slot-Content; der content-Prop-Wechsel schließt den Editor in der Komponente).
  async function handleSlotSave(slotKey, nextContent) {
    const title = SLOT_TITLES[slotKey] || slotKey
    setSlotMutations((prev) => ({ ...prev, [slotKey]: { saving: true, error: '' } }))
    try {
      const updated = await setSstdSlot(projectId, slotKey, nextContent)
      handleSlotSaved(slotKey, updated?.content ?? nextContent)
      setSlotMutations((prev) => ({ ...prev, [slotKey]: { saving: false, error: '' } }))
      toast(`Slot „${title}“ gespeichert`, 'success')
    } catch (e) {
      const msg = e?.message || 'Speichern fehlgeschlagen'
      setSlotMutations((prev) => ({ ...prev, [slotKey]: { saving: false, error: msg } }))
      toast(`Slot „${title}“: ${msg}`, 'error')
    }
  }

  // DD-599 (D04): Speichern aus dem Volltext-Fenster (editierbare Slots). Persistenz
  // identisch zur Inline-Mutation (setSstdSlot); bei Erfolg synct + schließt das Fenster.
  async function handleWindowSave(nextContent) {
    if (!slotWindow) return
    const key = slotWindow.key
    const title = SLOT_TITLES[key] || key
    setWindowMutation({ saving: true, error: '' })
    try {
      const updated = await setSstdSlot(projectId, key, nextContent)
      handleSlotSaved(key, updated?.content ?? nextContent)
      setWindowMutation({ saving: false, error: '' })
      setSlotWindow(null)
      toast(`Slot „${title}“ gespeichert`, 'success')
    } catch (e) {
      setWindowMutation({ saving: false, error: e?.message || 'Speichern fehlgeschlagen' })
    }
  }

  // DD-494 (I02): "Copy Full SSTD" — copies the FULL reassembled SSTD (all 6 slots
  // + the 2 read-all projections) for AI context. The canonical reassembly is the
  // server's GET /api/projects/:id/sstd → { sstd_content } (renderSstdReadAll), so we
  // copy that verbatim rather than join client-side (parity with the server order).
  // DD-493 R2 clipboard lesson: an awaited fetch inside the click handler consumes the
  // user-gesture activation on Safari/Firefox → NotAllowedError. So the SSTD is
  // PREFETCHED on mount (cached in sstdContent) and copyFull writes it SYNCHRONOUSLY.
  const [sstdContent, setSstdContent] = useState(null)
  const { copied: copiedFull, copy: copyFullToClipboard } = useCopyFeedback()

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    fetch(`/api/projects/${projectId}/sstd`, { headers: { 'X-Project-Id': String(projectId) } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) setSstdContent(data?.sstd_content ?? null) })
      .catch(err => {
        if (!cancelled) {
          setSstdContent(null)
          console.error('[DD-494] SSTD prefetch failed', err)
        }
      })
    return () => { cancelled = true }
  }, [projectId])

  const copyFull = () => {
    const payload = sstdContent
    if (!payload || !payload.trim()) {
      toast('SSTD ist noch nicht geladen', 'error')
      return
    }
    // DD-675: einheitliches Feedback (transienter Check + Toast) via Hook.
    copyFullToClipboard(payload, 'Vollständige SSTD kopiert')
  }

  const slotByKey = new Map(slots.map((s) => [s.slot_key, s]))
  const slotMax = slots.reduce((acc, s) => (s.updated_at && s.updated_at > acc ? s.updated_at : acc), '')

  return (
    <section
      role="tabpanel"
      id="tabpanel-sstd"
      aria-labelledby="tab-sstd"
      data-ui="project-home.tabs.sstd"
    >
      {/* Haupt-Panel: 6 editierbare Slots + 2 read-only Projektionen (DD-546: Single-Column, volle Breite) */}
      <div style={{ ...panelStyle, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <h2 style={{ ...headingStyle, marginBottom: 0 }}>SSTD</h2>
          <div className="flex items-center gap-[12px]">
            {slotMax && (
              <span style={{ fontSize: 12, color: 'var(--subtext0)' }}>
                Stand: {formatDate(slotMax)}
              </span>
            )}
            <button
              type="button"
              onClick={copyFull}
              disabled={!sstdContent}
              data-ui="project-home.tabs.sstd.copy-full"
              className="inline-flex items-center gap-[6px] min-h-[44px] px-[14px] rounded-[8px] border border-[var(--surface2)] bg-[var(--surface0)] text-[var(--text)] text-sm cursor-pointer disabled:opacity-60"
              title="Vollständige reassemblierte SSTD (alle 6 Slots + 2 Projektionen) in die Zwischenablage kopieren"
            >
              {copiedFull ? (
                <Check size={15} aria-hidden="true" className="text-[var(--accent-success)]" />
              ) : (
                <Copy size={15} aria-hidden="true" />
              )}
              {copiedFull ? 'Kopiert' : 'SSTD kopieren'}
            </button>
          </div>
        </div>

        {loading && <p style={hintStyle}>Lade SSTD…</p>}

        {!loading && error && (
          <p style={{ ...hintStyle, color: 'var(--red)' }} data-ui="project-home.tabs.sstd.error">
            Fehler: {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* DD-599 (D02): Slot-TOC am Seitenkopf — Direktsprung je Slot/Projektion. */}
            <SlotToc
              entries={SLOT_NAV_ORDER.map(({ kind, key }) => ({
                key,
                title: SLOT_NAV_TITLES[key],
                readonly: kind === 'projection',
              }))}
              label="SSTD — Slots"
              tocId={TOC_ID}
              onJump={(key) => scrollToId(slotDomId(key))}
              className="mb-4"
            />

            {SLOT_NAV_ORDER.map(({ kind, key }) => {
              const title = SLOT_NAV_TITLES[key]
              const isProjection = kind === 'projection'
              const content = isProjection
                ? (projections[key] || '')
                : (slotByKey.get(key)?.content || '')
              const projUiKey = key === 'next_steps' ? 'next-steps' : 'journal'
              return (
                <div key={key}>
                  {/* DD-599 (D05): „↑ Navigation"-Anker linksbündig über jedem Slot → TOC. */}
                  <button
                    type="button"
                    onClick={() => scrollToId(TOC_ID)}
                    data-ui={`detail.slot-nav.slot.${key}.back-to-nav`}
                    className="mb-1 flex items-center gap-1 text-[var(--subtext0)]"
                  >
                    <ArrowUp size={12} />
                    <span className="text-[10px] uppercase tracking-wider">Navigation</span>
                  </button>
                  {/* DD-599: Slot-Nav-Wrapper (Card-Chrome wie die TOC) + Sprung-id. Die
                      eigentliche Read/Edit-Logik liegt in SlotSection (Slots) bzw.
                      ProjectionSection (read-only Projektionen). */}
                  <section
                    id={slotDomId(key)}
                    data-ui={`detail.slot-nav.slot.${key}`}
                    className="mb-5 scroll-mt-4 rounded-md border border-[var(--surface1)] bg-[var(--mantle)] p-3"
                  >
                    {isProjection ? (
                      <ProjectionSection
                        uiKey={projUiKey}
                        title={title}
                        content={content}
                        clip={isMobile}
                        onExpand={() => openWindow({ key, title, body: content, mode: 'readonly' })}
                      />
                    ) : (
                      <SlotSection
                        slotKey={key}
                        title={title}
                        content={content}
                        rootDataUi="plugin.sstd.slot"
                        saving={!!slotMutations[key]?.saving}
                        error={slotMutations[key]?.error || ''}
                        onSave={handleSlotSave}
                        clip={isMobile}
                        hideEditButton={isMobile}
                        onExpand={() => openWindow({ key, title, body: content, mode: 'read' })}
                      />
                    )}
                  </section>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* DD-599 (D04): Volltext-Fenster (Viewport-Overlay). Editierbare Slots öffnen im
          Lese-Modus mit „Bearbeiten"-Trigger; read-only Projektionen rein lesend. */}
      <SlotFullTextWindow
        open={!!slotWindow}
        title={slotWindow?.title}
        body={slotWindow?.body}
        mode={slotWindow?.mode || 'read'}
        saving={windowMutation.saving}
        error={windowMutation.error}
        onClose={closeWindow}
        onSave={handleWindowSave}
      />
    </section>
  )
}
