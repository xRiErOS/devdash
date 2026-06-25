/**
 * ProjectQuickSwitcher (05.60 Overlay) — kanonisches, token-sauberes Organism, aus
 * dem Archiv extrahiert (DD-481 Harvest, DD-194/DD-368/DD-451). Projekt-Picker mit
 * Fuzzy-Search (Name/Slug/Prefix) + Keyboard-Navigation (Arrow/Enter/Esc) über eine
 * gefilterte Projekt-Liste plus zwei gepinnte Aktionen ("Projekt-Übersicht",
 * "Neues Projekt anlegen"). Komponiert die Atoms Input (Such-Feld) + PopoverPanel
 * (Floating-Panel-Optik).
 *
 * Präsentational: kein fetch/Store/Nav — die Mutation macht der Consumer über die
 * gehobenen Callbacks (onSelect/onOpenOverview/onCreateNew/onClose). data-ui je Element.
 * Keyboard-Verhalten (Arrow/Enter/Esc) ist im Interaction_Keyboard-Play abgesichert
 * (qa_behavioral:done); die statische Markup-Struktur im gf-project-quick-switcher-ref-Test.
 */
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import ProjectQuickSwitcher from '../../../components/ui/organisms/ProjectQuickSwitcher.jsx'

// Realistische MOCK-Projekt-Liste (bereits nicht-archiviert gefiltert, wie der
// Konsument sie liefern würde). Callbacks sind no-op.
const PROJECTS = [
  { id: 1, name: 'MyBaby Tracker', slug: 'mybaby', prefix: 'MBT', color: 'var(--accent-info)' },
  { id: 2, name: 'Developer Dashboard', slug: 'devd', prefix: 'DD', color: 'var(--accent-primary)' },
  { id: 3, name: 'Selene Menstruations App', slug: 'selene', prefix: 'SEL', color: 'var(--accent-danger)' },
  { id: 4, name: 'Home Dashboard', slug: 'home', prefix: 'HOME', color: 'var(--accent-success)' },
  { id: 5, name: 'Context OS', slug: 'conos', prefix: 'CON' },
]

const noop = () => {}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/ProjectQuickSwitcher',
  component: ProjectQuickSwitcher,
  tags: ['status:stable', 'qa_checklist:done', 'qa_behavioral:done', 'design_version:v2'],
  parameters: { layout: 'centered' },
}
export default meta

const baseArgs = {
  open: true,
  projects: PROJECTS,
  currentProjectId: 2,
  onSelect: noop,
  onOpenOverview: noop,
  onCreateNew: noop,
  onClose: noop,
}

// Default: root-minimaler Render — offen, zwei Projekte, kein aktives.
export const Default = {
  render: () => (
    <div data-ui="organism.project-quick-switcher.default">
      <ProjectQuickSwitcher
        open
        projects={PROJECTS.slice(0, 2)}
        currentProjectId={undefined}
        onSelect={noop}
        onOpenOverview={noop}
        onCreateNew={noop}
        onClose={noop}
      />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — mehrere Projekte, eines aktiv (currentProjectId).
export const Main = {
  render: () => (
    <div data-ui="organism.project-quick-switcher.main">
      <ProjectQuickSwitcher {...baseArgs} />
    </div>
  ),
}

// State_Empty: leere Projekt-Liste → "Keine Projekte gefunden."
export const State_Empty = {
  render: () => (
    <div data-ui="organism.project-quick-switcher.empty">
      <ProjectQuickSwitcher
        open
        projects={[]}
        currentProjectId={undefined}
        onSelect={noop}
        onOpenOverview={noop}
        onCreateNew={noop}
        onClose={noop}
      />
    </div>
  ),
}

// Variant_SingleProject: genau ein Projekt (zugleich das aktive).
export const Variant_SingleProject = {
  render: () => (
    <div data-ui="organism.project-quick-switcher.single-project">
      <ProjectQuickSwitcher
        open
        projects={[PROJECTS[0]]}
        currentProjectId={1}
        onSelect={noop}
        onOpenOverview={noop}
        onCreateNew={noop}
        onClose={noop}
      />
    </div>
  ),
}

// Variant_CustomScope: parametrisierter data-ui-Wurzelbereich (I03/D01).
export const Variant_CustomScope = {
  render: () => (
    <div data-ui="organism.project-quick-switcher.custom-scope">
      <ProjectQuickSwitcher {...baseArgs} dataUiScope="header.project-switcher" />
    </div>
  ),
}

// Interaction_Keyboard: Arrow bewegt den Cursor, Enter wählt, Esc schließt.
const selectSpy = fn()
const closeSpy = fn()
export const Interaction_Keyboard = {
  render: () => (
    <div data-ui="organism.project-quick-switcher.keyboard">
      <ProjectQuickSwitcher
        open
        projects={PROJECTS}
        currentProjectId={2}
        onSelect={selectSpy}
        onOpenOverview={noop}
        onCreateNew={noop}
        onClose={closeSpy}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    selectSpy.mockClear()
    closeSpy.mockClear()
    const input = canvas.getByLabelText('Projekt-Quick-Switcher')
    // Cursor startet auf Index 0 (erstes Projekt). ArrowDown → Index 1 (PROJECTS[1].id === 2).
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(selectSpy).toHaveBeenCalledWith(2))
    // ArrowDown dann ArrowUp lässt den Cursor wieder auf Index 1 stehen; Enter erneut Index 1.
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowUp}')
    selectSpy.mockClear()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(selectSpy).toHaveBeenCalledWith(2))
    // Esc schließt.
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(closeSpy).toHaveBeenCalled())
  },
}
