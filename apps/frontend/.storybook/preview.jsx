import '../src/index.css'
// DD-482: bestehender Debug-Layer (DD-273) als globaler Decorator — g→d Toggle,
// Alt-Klick-data-ui-Capture, bewegliches Notes-Panel in jeder Story. Self-contained
// (nur Hooks/window/document/localStorage), läuft in der Preview-Iframe.
import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import { DebugProvider, useDebug } from '../src/contexts/DebugContext.jsx'
import DebugOverlayView from '../src/components/ui/molecules/DebugOverlay.jsx'
import NotesPanel from '../src/components/ui/organisms/NotesPanel.jsx'
import { DocsContainer } from '@storybook/addon-docs/blocks'
import { themes } from 'storybook/theming'
import { initialize, mswLoader } from 'msw-storybook-addon'

// CT-Runner-Infra (chore/test-ct-runner-msw): MSW global initialisieren.
// onUnhandledRequest:'bypass' → Stories OHNE Handler erzeugen keinen Fehler
// (präsentationale args-driven Stories fetchen nicht; nur Fetcher-Stories setzen Handler).
initialize({ onUnhandledRequest: 'bypass' })

// DD-472 T3: DebugOverlay + NotesPanel sind nach dem Legacy→ui/-Cutover
// präsentational (props-driven). Die self-contained Decorator-Variante wird hier
// — wie in src/views/AppShell.jsx — über useDebug + createPortal rekonstruiert.
function DebugNotesPanel() {
  const {
    enabled,
    note,
    status,
    notePosition,
    notesRef,
    setNote,
    copyNotes,
    onNotesPointerDown,
    onNotesPointerMove,
    onNotesPointerUp,
  } = useDebug()
  const [notesCollapsed, setNotesCollapsed] = useState(false) // I02: minimierbar

  if (!enabled) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <NotesPanel
      value={note}
      onSave={setNote}
      onCopy={copyNotes}
      autoSaveMs={0}
      position={notePosition}
      statusLabel={status}
      dataUiScope="ui-debug.notes"
      textareaRef={notesRef}
      onDragPointerDown={onNotesPointerDown}
      onDragPointerMove={onNotesPointerMove}
      onDragPointerUp={onNotesPointerUp}
      collapsed={notesCollapsed}
      onToggleCollapse={() => setNotesCollapsed((c) => !c)}
    />,
    document.body,
  )
}

function DebugOverlay() {
  const { enabled, hover } = useDebug()
  if (!enabled) return null
  if (typeof document === 'undefined') return null

  const rect = hover?.rect ?? undefined
  const label = hover
    ? {
        left: Math.min(hover.x + 12, (typeof window !== 'undefined' ? window.innerWidth - 320 : 800)),
        top: Math.min(hover.y + 12, (typeof window !== 'undefined' ? window.innerHeight - 32 : 600)),
        text: hover.id,
      }
    : undefined

  return createPortal(
    <DebugOverlayView
      showIndicator
      rect={rect}
      label={label}
    />,
    document.body,
  )
}

/**
 * Globale Storybook-Konfiguration (DD-470).
 *
 * Theme-Toggle spiegelt den App-Mechanismus aus src/index.css:
 *   html[data-theme="dark"]  → Catppuccin Macchiato
 *   :root (kein Attribut)    → Catppuccin Latte (Default)
 * Wir pinnen das Attribut explizit (auch "light"), damit Stories nicht über die
 * prefers-color-scheme-Media-Query vom OS-Theme abhängen — deterministisch.
 *
 * DD-513 (FEAT-17 T01): Mobile-Viewport-Presets. Entscheidung D01 — SB10-Built-in
 * Viewport (`storybook/viewport` im Core) reicht; KEIN dediziertes
 * @storybook/addon-viewport nötig. Die Toolbar-Auswahl erscheint automatisch,
 * sobald `parameters.viewport.options` gesetzt ist; der Default-Frame kommt aus
 * `initialGlobals.viewport`. Per-Story-Pin (T02/T03) via
 * `globals: { viewport: { value: '<key>' } }`. Feste Custom-Maße (B×H) statt
 * INITIAL_VIEWPORTS, damit die vier PO-Geräte exakt getroffen sind.
 */

// DD-513: vier feste Geräte-Presets (PO-Vorgabe). Keys werden in Story-`globals`
// referenziert (z.B. mobile-Varianten pinnen 'iphonese' als kleinsten Fall).
const VIEWPORTS = {
  iphone14pro: { name: 'iPhone 14 Pro (393×852)', styles: { width: '393px', height: '852px' } },
  iphonese: { name: 'iPhone SE (375×667)', styles: { width: '375px', height: '667px' } },
  ipadpro: { name: 'iPad Pro (1024×1366)', styles: { width: '1024px', height: '1366px' } },
  // DD-633 (F1): iPad-Landscape — Two-Pane/Nav-Rail-Breakpoint (>=1024) der adaptiven
  // Shell. Portrait-Preset ipadpro deckt Landscape NICHT ab (B×H gedreht); SOLL-Stories
  // pinnen diesen Key. preview.jsx-only Edit → HMR, kein viteFinal/main.js-Neustart.
  ipadlandscape: { name: 'iPad Landscape (1366×1024)', styles: { width: '1366px', height: '1024px' } },
  desktop: { name: 'Desktop (1440×900)', styles: { width: '1440px', height: '900px' } },
}

// greenfield P0.2: Review-Erweiterung des Debug-Mode (nur Storybook). Gated über
// denselben useDebug().enabled (g→d). Erfasst je Story (context.id) ein Verdikt +
// Korrekturen und schreibt live via /__po-review nach specs-DD/02-RPDs/Greenfield-2/po-review.json.
// data-ui="ui-debug.review" → vom Debug-Hover-Capture (RESERVED_PREFIX) ignoriert.
// GF-211: GF-2-Review-Modell. verdict = Tier-Gate-Signal; entries = wachsende
// Knowledge-Base (5 Arten, KEINE Severity — Dringlichkeit driftet, D13).
const REVIEW_VERDICTS = ['ok', 'needs-work']
const ENTRY_KINDS = ['task', 'decision', 'bug', 'missing', 'idea']
const KIND_COLOR = { task: 'var(--blue)', decision: 'var(--mauve)', bug: 'var(--red)', missing: 'var(--peach)', idea: 'var(--teal)' }
const VERDICT_COLOR = { ok: 'var(--accent-success)', 'needs-work': 'var(--accent-primary)' }
const EMPTY_REVIEW = { verdict: '', entries: [], notes: '' }

function ReviewPanel({ storyId, label }) {
  const { enabled } = useDebug()
  const [data, setData] = useState(EMPTY_REVIEW)
  const [saved, setSaved] = useState('')
  const [open, setOpen] = useState(true)
  const [draftText, setDraftText] = useState('')
  const [draftKind, setDraftKind] = useState('task')
  // GF-338: freies Notizfeld (Freitext, separat von strukturierten entries). Lokaler
  // Draft — explizite Buttons „speichern"/„leeren" (kein Auto-Save, D03). Textarea-Höhe
  // folgt dem Inhalt (auto-grow via Ref).
  const [notesDraft, setNotesDraft] = useState('')
  const notesRef = useRef(null)
  // I02: bewegbar. Drag-Offset via PointerCapture am Header (keine window-Listener).
  const [pos, setPos] = useState(() => ({ x: typeof window !== 'undefined' ? Math.max(12, window.innerWidth - 332) : 1080, y: 12 }))
  const drag = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    fetch('/__po-review')
      .then((r) => r.json())
      .then((all) => {
        if (!alive) return
        const merged = { ...EMPTY_REVIEW, ...(all[storyId] || {}) }
        setData(merged)
        setNotesDraft(merged.notes || '')
      })
      .catch(() => {})
    return () => { alive = false }
  }, [storyId, enabled])

  // Auto-grow: Textarea-Höhe = Inhalt (reset auf auto, dann scrollHeight). Läuft bei
  // jeder Inhaltsänderung und beim Auf-/Zuklappen (open) des Panels.
  useEffect(() => {
    const el = notesRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [notesDraft, open])

  if (!enabled || typeof document === 'undefined') return null

  // GF-211: diskrete/on-blur Saves (kein per-Keystroke-Write mehr, D15). Routing
  // downstream (D14): task/bug/missing→GF-Issue, decision→project_memory,
  // missing→zusätzlich Anti-Drift-Signal (Story-Wahrheit).
  const save = (next) => {
    setData(next)
    setSaved('…')
    const has = next.verdict || (next.notes && next.notes.trim()) || (next.entries && next.entries.length)
    fetch('/__po-review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storyId, data: has ? { ...next, label } : null }),
    })
      .then(() => setSaved('✓ gespeichert'))
      .catch(() => setSaved('✗ Fehler'))
  }

  const setVerdict = (v) => save({ ...data, verdict: data.verdict === v ? '' : v })
  const addEntry = () => {
    const text = draftText.trim()
    if (!text) return
    const id = `${Date.now()}-${Math.round(Math.random() * 1e4)}`
    save({ ...data, entries: [...data.entries, { id, kind: draftKind, text, done: false }] })
    setDraftText('')
  }
  const toggleDone = (id) => save({ ...data, entries: data.entries.map((e) => (e.id === id ? { ...e, done: !e.done } : e)) })
  const removeEntry = (id) => save({ ...data, entries: data.entries.filter((e) => e.id !== id) })
  // GF-338: „speichern" → persistiert in po-review.json nur wenn geändert;
  // „leeren" → Feld + persistierten Wert löschen.
  const saveNotes = () => { if ((data.notes || '') !== notesDraft) save({ ...data, notes: notesDraft }) }
  const clearNotes = () => { setNotesDraft(''); save({ ...data, notes: '' }) }

  const onDragDown = (e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; e.currentTarget.setPointerCapture?.(e.pointerId) }
  const onDragMove = (e) => { if (drag.current) setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }) }
  const onDragUp = () => { drag.current = null }

  // I04: größere Schrift. I03: Chrome an NotesPanel angeglichen (surface1-Body,
  // surface0-Header, shadow-pop, Drag-Handle, uppercase-Title, data-ui-Scopes).
  const input = {
    width: '100%', boxSizing: 'border-box', padding: '7px 9px',
    fontSize: 13, borderRadius: 6, border: '1px solid var(--surface0)',
    background: 'var(--base)', color: 'var(--text)',
  }
  const chip = (active, color) => ({
    fontSize: 12, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
    border: '1px solid var(--surface1)',
    background: active ? color : 'var(--base)', color: active ? 'var(--base)' : 'var(--text)',
  })

  return createPortal(
    <div data-ui="ui-debug.review" style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 2147483600, width: open ? 320 : 220, fontFamily: 'system-ui, sans-serif', borderRadius: 8, border: '1px solid var(--surface0)', background: 'var(--surface1)', color: 'var(--text)', boxShadow: 'var(--shadow-pop)', overflow: 'hidden' }}>
      <div
        data-ui="ui-debug.review.drag-handle"
        onPointerDown={onDragDown}
        onPointerMove={onDragMove}
        onPointerUp={onDragUp}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface0)', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
      >
        <strong data-ui="ui-debug.review.title" style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>★ Review</strong>
        <span data-ui="ui-debug.review.status" style={{ flex: 1, fontSize: 11, color: 'var(--subtext0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{saved}</span>
        <button type="button" data-ui="ui-debug.review.minimize" onClick={() => setOpen((o) => !o)} onPointerDown={(e) => e.stopPropagation()} aria-label={open ? 'minimieren' : 'öffnen'} style={{ fontSize: 14, lineHeight: 1, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--text)' }}>{open ? '▾' : '▸'}</button>
      </div>
      {open && (
        <div data-ui="ui-debug.review.body" style={{ padding: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--subtext0)', marginBottom: 8, wordBreak: 'break-all' }}>{label}</div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
            {REVIEW_VERDICTS.map((v) => (
              <button key={v} type="button" onClick={() => setVerdict(v)} style={chip(data.verdict === v, VERDICT_COLOR[v])}>{v}</button>
            ))}
          </div>
          {data.entries.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {data.entries.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                  <input type="checkbox" checked={e.done} onChange={() => toggleDone(e.id)} style={{ marginTop: 3, cursor: 'pointer' }} />
                  <span style={{ fontSize: 10, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 4, background: KIND_COLOR[e.kind] || 'var(--overlay0)', color: 'var(--base)', flexShrink: 0 }}>{e.kind}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', textDecoration: e.done ? 'line-through' : 'none', opacity: e.done ? 0.5 : 1, flex: 1, wordBreak: 'break-word' }}>{e.text}</span>
                  <button type="button" onClick={() => removeEntry(e.id)} style={{ fontSize: 14, lineHeight: 1, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--subtext0)' }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {ENTRY_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setDraftKind(k)} style={chip(draftKind === k, KIND_COLOR[k])}>{k}</button>
            ))}
          </div>
          <input
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={addEntry}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEntry() } }}
            placeholder={`Neuer ${draftKind} … (Enter/Verlassen)`}
            style={input}
          />
          <div data-ui="ui-debug.review.notes" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--surface0)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--subtext0)', marginBottom: 4 }}>Notizen</div>
            <textarea
              ref={notesRef}
              data-ui="ui-debug.review.notes.input"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Freitext-Notizen … (wächst mit Inhalt)"
              style={{ ...input, minHeight: 52, lineHeight: 1.45, fontFamily: 'inherit', resize: 'none', overflow: 'hidden' }}
            />
            <div data-ui="ui-debug.review.notes.actions" style={{ display: 'flex', gap: 5, marginTop: 5 }}>
              <button
                type="button"
                data-ui="ui-debug.review.notes.save"
                onClick={saveNotes}
                style={{ ...chip(false, 'var(--accent-success)'), fontSize: 11 }}
              >speichern</button>
              <button
                type="button"
                data-ui="ui-debug.review.notes.clear"
                onClick={clearNotes}
                style={{ ...chip(false, 'var(--red)'), fontSize: 11 }}
              >leeren</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

// I01 (GF-212): Docs/MDX folgen dem Theme-Toggle. Reihenfolge: Toolbar-Global
// (light/dark) → data-theme (von gerenderter Story gesetzt) → OS-prefers (reine
// MDX-Seiten ohne Story, Nacht-Lesen). Setzt data-theme, damit auch var()-Prosa folgt.
function pickDocsTheme(context) {
  const g = context?.globals?.theme ?? context?.store?.userGlobals?.globals?.theme
  if (g === 'dark' || g === 'light') return g
  if (typeof document !== 'undefined') {
    const dt = document.documentElement.getAttribute('data-theme')
    if (dt === 'dark' || dt === 'light') return dt
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function ThemedDocsContainer({ children, context }) {
  const mode = pickDocsTheme(context)
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', mode)
  }, [mode])
  return (
    <DocsContainer context={context} theme={mode === 'dark' ? themes.dark : themes.light}>
      {children}
    </DocsContainer>
  )
}

/** @type {import('@storybook/react-vite').Preview} */
const preview = {
  // GF-2 (GF-203): Autodocs projektweit — per !autodocs je Story/Meta abwählbar.
  tags: ['autodocs'],
  // MSW-Loader (CT-Runner): zieht parameters.msw.handlers je Story vor dem Render.
  loaders: [mswLoader],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: { disable: true },
    viewport: { options: VIEWPORTS },
    // GF-339: Sidebar-Sort. Reihenfolge: Tier-Präfix 01..05 → 20 Mockups → 90 Archive.
    // Innerhalb jeder Gruppe alphabetisch; Story „Overview" immer zuerst gepinnt.
    options: {
      storySort: (a, b) => {
        // Tier-Rang: 01..05 = 1..5, 20 Mockups = 6, 90 Archive = 7, sonst 4 (Mitte)
        const tierRank = (title) => {
          const m = title.match(/^(\d+)\s/)
          if (!m) return 4
          const n = parseInt(m[1], 10)
          if (n >= 1 && n <= 5) return n
          if (n === 20) return 6
          if (n === 90) return 7
          return 4
        }
        const rankA = tierRank(a.title)
        const rankB = tierRank(b.title)
        if (rankA !== rankB) return rankA - rankB
        // Innerhalb gleicher Gruppe: „Overview" zuerst, dann alphabetisch nach title+name
        const isOverviewA = a.name === 'Overview'
        const isOverviewB = b.name === 'Overview'
        if (isOverviewA && !isOverviewB) return -1
        if (!isOverviewA && isOverviewB) return 1
        const titleCmp = a.title.localeCompare(b.title)
        if (titleCmp !== 0) return titleCmp
        return a.name.localeCompare(b.name)
      },
    },
    // a11y informativ (Q02): Violations werden als 'todo' gemeldet, blocken nicht.
    // Hartes CI-Gate erst Realisierungs-Phase mit CT-Runner (addon-vitest).
    a11y: { test: 'todo' },
    // I01: Docs-Theme folgt dem Toolbar-Toggle (Latte/Macchiato).
    docs: { container: ThemedDocsContainer },
  },
  initialGlobals: {
    // Default = Desktop-Frame; Theme und Viewport sind unabhängig kombinierbar.
    viewport: { value: 'desktop', isRotated: false },
  },
  globalTypes: {
    theme: {
      description: 'Catppuccin-Theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Latte (light)' },
          { value: 'dark', title: 'Macchiato (dark)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light'
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme)
      }
      // GF-212 Bug: Im Docs-View (autodocs projektweit) rendert eine Seite N
      // Stories → der Decorator läuft je Story-Instanz → je ein createPortal an
      // document.body → N gestapelte Debug-/Review-Panels ("mehrere Fenster" beim
      // Ziehen). Debug-Layer gehört in den interaktiven Canvas, nicht in Docs.
      const isStory = context.viewMode === 'story'
      // fullBleed (z.B. AppShell/Screen-Stories): kein Canvas-Padding, volle Höhe →
      // die Shell sitzt flush am Viewport-Rand wie in der echten App.
      const fullBleed = context.parameters?.fullBleed === true
      const wrapStyle = fullBleed
        ? { background: 'var(--base)', color: 'var(--text)', height: '100vh' }
        : { background: 'var(--base)', color: 'var(--text)', padding: '1.5rem', minHeight: '100vh' }
      return (
        <DebugProvider>
          <div style={wrapStyle}>
            <Story />
          </div>
          {/* Debug-Layer: default aus, g→d aktiviert. Portalt an iframe-body.
              Nur im Story-Canvas (1 Instanz), nie im Docs-View (N Instanzen). */}
          {isStory && <DebugOverlay />}
          {isStory && <DebugNotesPanel />}
          {/* greenfield P0.2: Review-Panel — gleiches g→d-Gate, per-Story Live-Write. */}
          {isStory && <ReviewPanel storyId={context.id} label={`${context.title} · ${context.name}`} />}
        </DebugProvider>
      )
    },
  ],
}

export default preview
