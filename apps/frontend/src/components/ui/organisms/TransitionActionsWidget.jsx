import Button from '../atoms/Button.jsx'
import WidgetBase from './WidgetBase.jsx'
import Select from '../molecules/Select.jsx'
import Cluster from '../layout/Cluster.jsx'
import Stack from '../layout/Stack.jsx'

/**
 * TransitionActionsWidget — Organism (05.30 Widgets, OR-18, GF-253/GF-337 V2). Zeigt die
 * für eine Entität (Issue/Sprint/Milestone) zulässigen Lifecycle-Transitions als
 * Aktions-Buttons. Die Lifecycle-Validierung bleibt autoritativ beim Backend — der
 * Consumer liefert nur die gültigen `transitions`; der Klick ruft `onTransition(key)`.
 *
 * V2-Terminal-Token (In-Place, grill-me D01-D04):
 *  - **titellos per Default** (`showTitle=false`, D02) — der Titel kommt zentral aus dem
 *    EntityDetail-Slot; nur der Standalone-Fall setzt `showTitle`.
 *  - **`dataUiScope`** parametrierbar (Consumer-Parent-Scope, CONV-461) — alle Sub-Anker
 *    werden als `${dataUiScope}.*` abgeleitet (kein roher Molekül-Anker durchgereicht).
 *  - **Kompaktierung (D04):** <5 Transitions → Button-Cluster (flex-wrap, responsive);
 *    ab 5 → Select-Field (selten, z.B. Admin-Achse).
 *  - **Terminal-Tint:** Buttons rendern `appearance="tint"` (border-driven, ton-getönt,
 *    scharf) — Terminal-Sprache statt gefüllter Akzent-Blocks (PO 2026-06-19).
 *  - **Kein PO-Marker/poExclusive** (PO 2026-06-19): KI nutzt MCP, nicht das Frontend
 *    → der DD-186-UI-Guard ist irrelevant; Backend + Consumer bleiben der Gate.
 *
 * Präsentational/controlled wie die V2-Widget-Kette (ContentBlock/EntityTags): kein
 * Store/Fetch/useEffect, kein Note-/Edit-Flow. Mutation nur als `onTransition(key)`.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.heading] - optionaler Self-Title (WidgetBase →
 *   WidgetHeading: Dot + `--heading-accent`, KEIN `// `-Slash) ÜBER den Buttons, ohne top-right
 *   Action (die Transition-Buttons SIND der Inhalt). Weggelassen → headless (Back-Compat: Titel
 *   kommt aus dem EntityDetail-Slot, z.B. Sprint-/Milestone-/MemoryDetails).
 * @param {string} [props.title='Aktionen'] - Überschrift (nur sichtbar bei showTitle).
 * @param {boolean} [props.showTitle=false] - Titel-Zeile anzeigen (false = titellos, D02).
 * @param {Array<{key:string,label:import('react').ReactNode,
 *   variant?:'primary'|'secondary'|'ghost'|'danger'|'success',
 *   disabled?:boolean,hint?:string}>} [props.transitions] - zulässige Übergänge (generisches
 *   `disabled` z.B. für Backend-Reject; `hint` = title-Tooltip).
 * @param {(key:string)=>void} [props.onTransition] - Klick-/Auswahl-Callback.
 * @param {import('react').ReactNode} [props.emptyHint='Keine Aktionen verfügbar.'] - Leer-Hinweis.
 * @param {number} [props.selectThreshold=5] - ab dieser Übergangs-Anzahl Select statt Cluster (D04).
 * @param {'crust'|'mantle'|'base'|'surface0'|'surface1'|'transparent'} [props.tone='transparent'] - DEPRECATED
 *   (Back-Compat-Signatur). Der frühere transparente Widget-Root ist mit dem 6-Ebenen-WidgetBase-Canon
 *   (PO 2026-06-20) retired — WidgetBase liefert jetzt zentral Layer-3-Fill + Border + Radius + Padding.
 *   Der Prop hat keine visuelle Wirkung mehr.
 * @param {boolean} [props.bordered=false] - DEPRECATED — Border kommt jetzt aus WidgetBase (Token-Border).
 * @param {'none'|'sm'|'md'} [props.padding='md'] - DEPRECATED — Padding kommt jetzt aus WidgetBase.
 * @param {boolean} [props.compact=false] - dichter Stack-Gap (keine vertikale Lücke).
 * @param {string} [props.dataUiScope='transition-actions'] - parametrierter data-ui-Wurzelbereich (CONV-461).
 * @param {string} [props.className]
 */
export default function TransitionActionsWidget({
  heading,
  title = 'Aktionen',
  showTitle = false,
  transitions = [],
  onTransition,
  emptyHint = 'Keine Aktionen verfügbar.',
  selectThreshold = 5,
  compact = false,
  dataUiScope = 'transition-actions',
  className = '',
}) {
  // GF-2 Wave-4: tone/bordered/padding entfallen — WidgetBase liefert Fill/Border/Radius/Padding.
  // Überzählige Caller-Props werden harmlos ignoriert (kein Rest-Spread).
  const asSelect = transitions.length >= selectThreshold

  return (
    <WidgetBase heading={heading} dataUi={dataUiScope} className={className}>
      <Stack gap={compact ? 'none' : 'sm'}>
        {showTitle && (
          <h3 data-ui={`${dataUiScope}.title`} className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text)]">
            {title}
          </h3>
        )}

        {transitions.length === 0 ? (
          <p data-ui={`${dataUiScope}.empty-hint`} className="text-xs text-[var(--subtext0)]">
            {emptyHint}
          </p>
        ) : asSelect ? (
          <Select
            data-ui={`${dataUiScope}.select`}
            value={null}
            options={transitions.map((t) => ({ value: t.key, label: t.label }))}
            onChange={(key) => onTransition?.(key)}
            ariaLabel={title}
            placeholder="Übergang wählen…"
            size="sm"
          />
        ) : (
          <Cluster gap="sm">
            {transitions.map((t) => (
              <Button
                key={t.key}
                variant={t.variant || 'secondary'}
                appearance="tint"
                size="sm"
                disabled={t.disabled}
                title={t.hint}
                onClick={() => onTransition?.(t.key)}
                data-ui={`${dataUiScope}.action-${t.key}`}
              >
                {t.label}
              </Button>
            ))}
          </Cluster>
        )}
      </Stack>
    </WidgetBase>
  )
}
