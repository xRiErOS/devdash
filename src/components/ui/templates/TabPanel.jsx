/**
 * TabPanel — kanonische, token-saubere Tabpanel-Wrapper-Shell (DD-481 Phase 4
 * Templates, PO-Decision D-S2: kollabiert die 4 fast identischen Tab-Wrapper
 * INV-105 BacklogTab / INV-110 OverviewTab / INV-114 RoadmapTab /
 * INV-115 SettingsTab in EIN generisches Template).
 *
 * TIER = TEMPLATE: reine Layout-Slot-Shell. Kennt KEINE Domäne — weiß nichts von
 * Backlog, Overview, Roadmap oder Settings. Liefert nur das generische
 * `role="tabpanel"`-Gerüst mit korrekter ARIA-Verdrahtung (id + aria-labelledby),
 * optionaler Padding-/Card-Variante und der `embedded`-Weitergabe an das
 * Slot-Kind. Die 4 konkreten Tabs aus projectHome/tabs/ sind in Phase 5 nur noch
 * Anwendungen davon: jeder importiert seinen Screen (BacklogPage / RoadmapBoard /
 * ProjectSettings …) und reicht ihn als children durch.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch, kein useEffect-Datenladen, kein
 * Store/projectStore, keine API, kein Routing. Die Quellen waren bereits reine
 * Wrapper — gehobene/entfernte Kopplung beim Harvest:
 *  - Konkrete Screen-Imports (BacklogPage, RoadmapBoard, ProjectSettings) →
 *    ENTFERNT. Der Screen wird als `children`-Slot durchgereicht; die
 *    `embedded`-Weitergabe an das Slot-Kind übernimmt jetzt die anwendende View
 *    (Phase-5-Tab) explizit, nicht dieses Template.
 *  - Hartcodierte id/aria/data-ui-Strings (`tabpanel-backlog`, `tab-backlog`,
 *    `project-home.tabs.backlog`) → parametrisiert über tabId / labelledBy /
 *    dataUiScope.
 *  - Die OverviewTab-Stub-Variante mit eigenem Card-Rahmen (panelStyle/
 *    headingStyle/hintStyle, alle inline-style) → als `padding="card"`-Variante
 *    token-clean gehoben; Heading/Hint sind Domäneninhalt und kommen als
 *    children.
 *
 * Ephemerer UI-State: keiner nötig (reines Slot-Rendering).
 *
 * TOKEN-CLEAN: die ~3 inline-style-Objekte der OverviewTab-Quelle
 * (var(--mantle)/var(--surface0)/var(--text), feste px/borderRadius) wurden zu
 * statischen Tailwind-v4-arbitrary-Klassen in der `card`-Padding-Variante
 * konvertiert. Das Template trägt 0 double-brace inline-style.
 *
 * Padding-Varianten (statische Klassen-Map):
 *  - none → kein Padding/Rahmen (Default; embedded-Screens bringen ihr eigenes
 *    Layout mit — entspricht BacklogTab/RoadmapTab/SettingsTab).
 *  - tight → schmales Padding ohne Rahmen.
 *  - card → mantle-Card mit Rahmen + Padding + min-height (entspricht der alten
 *    OverviewTab-Stub-Optik).
 *
 * @param {object} props
 * @param {React.ReactNode} props.children          - Slot-Inhalt (der eingebettete Screen/Stub)
 * @param {string} props.tabId                      - id-Wert des Panels (z.B. 'backlog' → id="tabpanel-backlog")
 * @param {string} [props.labelledBy]               - id des zugehörigen Tab-Buttons (Default: `tab-${tabId}`)
 * @param {'none'|'tight'|'card'} [props.padding='none'] - Padding-/Rahmen-Variante
 * @param {boolean} [props.hidden=false]            - Panel inaktiv (display:none + aria-hidden)
 * @param {'div'|'section'} [props.as='section']    - Wurzel-Element
 * @param {string} [props.dataUiScope='tab-panel']  - Wurzel-data-ui-bereich (parametrisiert)
 * @param {string} [props.className]
 */
const PADDING_CLASSES = {
  none: '',
  tight: 'p-3',
  card: 'rounded-lg border border-[var(--surface0)] bg-[var(--mantle)] p-4 min-h-[240px]',
}

export default function TabPanel({
  children,
  tabId,
  labelledBy,
  padding = 'none',
  hidden = false,
  as = 'section',
  dataUiScope = 'tab-panel',
  className = '',
}) {
  const Root = as
  const paddingClass = PADDING_CLASSES[padding] ?? PADDING_CLASSES.none
  const labelId = labelledBy ?? (tabId ? `tab-${tabId}` : undefined)

  return (
    <Root
      role="tabpanel"
      id={tabId ? `tabpanel-${tabId}` : undefined}
      aria-labelledby={labelId}
      aria-hidden={hidden || undefined}
      data-ui={dataUiScope}
      className={`${hidden ? 'hidden' : ''} ${paddingClass} ${className}`.trim()}
    >
      {children}
    </Root>
  )
}
