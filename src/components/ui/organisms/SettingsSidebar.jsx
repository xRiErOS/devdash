/**
 * SettingsSidebar — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/projectHome/SettingsSidebar.jsx, DD-282 R4 / DD-339 R5 / DD-368).
 *
 * Domänen-bewusste Einheit: Projekt-Settings-Sidebar mit vier Card-Sektionen
 * (Reihenfolge Meta → ToDo-Preview → Dependency-Chain → Quick-Settings). Kennt
 * das Projekt-/ToDo-/Milestone-Vokabular → ORGANISM-Tier. Komponiert die
 * ../molecules/MetaCard.jsx (Projekt-Meta als Label/Value-Zeilen) und das
 * ./TodoPreviewSection.jsx-Organism (Top-N offene ToDos, Batch 1). Dependency-
 * Chain + Quick-Settings sind als token-cleane Card-Shells inline harvestet
 * (MetaCard-Look ohne Meta-Zeilen).
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen, keine
 * Router-Kopplung. Gehobene Kopplung gegenüber der Quelle:
 *  - ENTFERNT: `useProjectTodos(project.id)`-Hook (Store/Fetch) der MetaCard/
 *    TodoPreview speiste. ToDos kommen jetzt als `todos`-Prop, der Lade-Zustand
 *    als `todosLoading`-Prop, und werden an das TodoPreviewSection-Organism
 *    durchgereicht.
 *  - ENTFERNT: `useParams()` (react-router) für den Settings-Deep-Link. Das Ziel
 *    ist jetzt als `settingsHref`-Prop gehoben; statt eines `<Link>` rendert die
 *    Sidebar ein semantisches `<a>` (Routing ist Sache des Konsumenten).
 *  - ENTFERNT: die inline `MetaCard`-Sub-Komponente mit eigener Clipboard-Logik
 *    und das inline `slug`/`prefix`-Derivat aus `project`. Die Meta-Zeilen werden
 *    jetzt deklarativ aus den Props (`project`, `projectName`) berechnet und an
 *    die MetaCard-Molecule übergeben; Copy-Action ist als optionaler
 *    `onCopyMeta`-Callback gehoben.
 *  - ENTFERNT: ~12× inline-`style`-Objekte (card/cardHead/iconWrap/cardTitle/
 *    cardMeta/placeholderText/previewItem/copyBtn + collapsed/expanded aside +
 *    Link-Style) → Tailwind-v4-Arbitrary-Token-Klassen.
 *
 * Ephemerer UI-State: keiner nötig (reine Render-Komposition; der ehemalige
 * `copied`-State der inline-MetaCard ist mit dem Copy-Callback hinausgehoben).
 *
 * @param {object} props
 * @param {boolean} [props.collapsed=false] - eingeklappte Schmalspur-Variante
 * @param {string} [props.projectName] - Anzeigename des Projekts
 * @param {object} [props.project] - Projekt-Stammdaten { id, slug, prefix, ... }
 * @param {Array<{id:number|string, label?:string, status?:string}>} [props.todos=[]] - ToDos (extern geladen)
 * @param {boolean} [props.todosLoading=false] - ToDo-Lade-Zustand (extern gesteuert)
 * @param {string} [props.settingsHref] - Ziel des „Edit full project settings"-Links
 * @param {()=>void} [props.onCopyMeta] - optionaler Copy-Trigger für die Meta-Karte (gehoben)
 * @param {string} [props.dataUiScope='settings-sidebar'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen für die Wurzel
 */

import { ArrowRight, Check, Copy as CopyIcon } from 'lucide-react'
import MetaCard from '../molecules/MetaCard.jsx'
import CardHead from '../atoms/CardHead.jsx'
import Ico from '../atoms/Ico.jsx'
import TodoPreviewSection from './TodoPreviewSection.jsx'
import useCopyFeedback from '../../../hooks/useCopyFeedback.js'

// Card-Head-Icons als statische SVG-Slots (verlustfrei aus der Quelle).
const META_ICON = (
  <Ico icon={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>} />
)
const DEPENDENCY_ICON = (
  <Ico icon={<><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></>} />
)
const QUICK_SETTINGS_ICON = (
  <Ico icon={<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>} />
)

// Card-Shell (mantle-bg, surface0-border, radius, pad, shadow-card) — token-clean
// Ersatz für das inline `card`-Style-Objekt der Quelle.
const CARD_SHELL =
  'relative rounded-lg border border-[var(--surface0)] bg-[var(--mantle)] p-4 shadow-[var(--shadow-card)]'
const PLACEHOLDER_TEXT =
  'm-0 text-xs leading-normal text-[var(--subtext0)] font-[var(--font-display,system-ui)]'
const CARD_META =
  'ml-auto text-[11px] text-[var(--subtext0)] font-[var(--font-display,system-ui)]'

export default function SettingsSidebar({
  collapsed = false,
  projectName,
  project,
  todos = [],
  todosLoading = false,
  settingsHref,
  onCopyMeta,
  dataUiScope = 'settings-sidebar',
  className = '',
}) {
  // DD-675: einheitliches Copy-Feedback (transienter Check + Toast). SYNCHRON
  // (kein await vor dem Hook-copy): writeText muss im selben Klick-Tick starten,
  // sonst verfällt die User-Geste auf Safari/Firefox (DD-493 NotAllowedError).
  const { copied: metaCopied, copy: copyMeta } = useCopyFeedback()
  const handleCopyMeta = () => {
    const text = onCopyMeta ? onCopyMeta() : null
    if (typeof text === 'string') copyMeta(text, 'Projekt-Meta kopiert')
  }

  if (collapsed) {
    return (
      <aside
        data-ui={dataUiScope}
        aria-label="Project-Sidebar (eingeklappt)"
        className={`flex min-h-0 w-12 flex-col items-center gap-3 py-3 text-[10px] text-[var(--subtext0)] font-[var(--font-display,system-ui)] [writing-mode:vertical-rl] [text-orientation:mixed] ${className}`}
      >
        <span className="rotate-180">{projectName || 'Project'}</span>
      </aside>
    )
  }

  const slug = project?.slug || (projectName ? projectName.toLowerCase() : '')
  const prefix = project?.prefix

  // Meta-Zeilen deklarativ aus den Props (Ersatz für die inline-MetaCard-Logik).
  const metaRows = [
    project?.id != null && { label: 'ID', value: String(project.id) },
    { label: 'Name', value: projectName || '—' },
    slug && { label: 'Slug', value: slug },
    prefix && { label: 'Prefix', value: prefix },
  ].filter(Boolean)

  return (
    <aside
      data-ui={dataUiScope}
      aria-label="Project-Sidebar"
      className={`flex min-h-0 flex-col gap-4 overflow-y-auto ${className}`}
    >
      {/* 1 — Meta (Projektdaten inkl. DB-ID + optionaler Copy-Trigger) */}
      <div data-ui={`${dataUiScope}.meta`} className="relative">
        <MetaCard icon={META_ICON} title="Projekt-Meta" rows={metaRows} data-ui={`${dataUiScope}.meta.card`} />
        {onCopyMeta && (
          <button
            type="button"
            onClick={handleCopyMeta}
            data-ui={`${dataUiScope}.meta.copy`}
            aria-label="Projekt-Meta kopieren"
            title={metaCopied ? 'Kopiert' : 'Kopieren'}
            className="absolute top-3 right-3 grid h-[26px] w-[26px] place-items-center rounded-md border border-[var(--surface0)] bg-transparent p-0 text-[var(--subtext0)] hover:bg-[var(--surface0)]"
          >
            {metaCopied ? (
              <Check size={14} aria-hidden="true" className="text-[var(--accent-success)]" />
            ) : (
              <CopyIcon size={14} />
            )}
          </button>
        )}
      </div>

      {/* 2 — ToDo-Preview (Top 5 offene, extern geladen) */}
      <TodoPreviewSection
        todos={todos}
        loading={todosLoading}
        dataUiScope={`${dataUiScope}.todo-preview`}
      />

      {/* 3 — Dependency-Chain (Card-Shell, Daten-Slice folgt) */}
      <section data-ui={`${dataUiScope}.dependency`} className={CARD_SHELL}>
        <CardHead
          icon={DEPENDENCY_ICON}
          title={
            <span className="flex w-full items-center">
              Dependency-Chain
              <span data-ui={`${dataUiScope}.dependency.meta`} className={CARD_META}>
                Klick → Milestone
              </span>
            </span>
          }
          data-ui={`${dataUiScope}.dependency.head`}
        />
        <p data-ui={`${dataUiScope}.dependency.placeholder`} className={PLACEHOLDER_TEXT}>
          Milestone-Abhängigkeiten erscheinen hier als verkettete Nodes.
        </p>
      </section>

      {/* 4 — Quick-Settings */}
      <section data-ui={`${dataUiScope}.quick-settings`} className={CARD_SHELL}>
        <CardHead
          icon={QUICK_SETTINGS_ICON}
          title="Quick-Settings"
          data-ui={`${dataUiScope}.quick-settings.head`}
        />
        <a
          href={settingsHref || '#'}
          data-ui={`${dataUiScope}.quick-settings.full`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--surface0)] px-2.5 py-1.5 text-[11px] text-[var(--subtext0)] no-underline font-[var(--font-display,system-ui)] hover:bg-[var(--surface0)]"
        >
          Edit full project settings
          <ArrowRight size={12} aria-hidden="true" />
        </a>
      </section>
    </aside>
  )
}
