import '../src/index.css'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { DebugProvider, useDebug } from '../src/contexts/DebugContext.jsx'
import DebugOverlayView from '../src/ui/molecules/DebugOverlay.jsx'
import NotesPanel from '../src/ui/organisms/complex/NotesPanel.jsx'
import { DocsContainer } from '@storybook/addon-docs/blocks'
import { themes } from 'storybook/theming'
import { MdxCode } from './MermaidDocs.jsx'
import { initialize, mswLoader } from 'msw-storybook-addon'

// CT-Runner-Infra (chore/test-ct-runner-msw): MSW global initialisieren.
// onUnhandledRequest:'bypass' → Stories OHNE Handler erzeugen keinen Fehler
// (präsentationale args-driven Stories fetchen nicht; nur Fetcher-Stories setzen Handler).
initialize({ onUnhandledRequest: 'bypass' })

// DD-482: DebugOverlay + NotesPanel als globaler Decorator (g→d Toggle, Alt-Klick-data-ui-Capture).
function DebugNotesPanel() {
  const {
    enabled, note, status, notePosition, notesRef,
    setNote, copyNotes, onNotesPointerDown, onNotesPointerMove, onNotesPointerUp,
  } = useDebug()
  const [notesCollapsed, setNotesCollapsed] = useState(false)
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
    <DebugOverlayView showIndicator rect={rect} label={label} />,
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
    // MdxCode: ```mermaid-Fences → client-seitiges SVG (gen-composition + data-ui-Anker).
    docs: { container: ThemedDocsContainer, components: { code: MdxCode } },
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
          {isStory && <DebugOverlay />}
          {isStory && <DebugNotesPanel />}
        </DebugProvider>
      )
    },
  ],
}

export default preview
