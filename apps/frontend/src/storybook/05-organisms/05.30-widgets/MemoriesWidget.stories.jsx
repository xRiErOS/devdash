/**
 * MemoriesWidget — Organism-Story (05.30 Widgets, GF-375 V2). Verknüpfte Memories als bordered
 * Rows (Memories sind persistent, nicht abhakbar; haben IMMER eine Quelle → Öffnen-Icon). Add-
 * IconButton öffnet die MemoryForm (Body-Swap): Such/Filter/Sort über den Projekt-Memory-Pool,
 * Auswahl via Checkbox. Picking/Interactive = Klickpfade (play, L5).
 */
import { useState } from 'react'
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import MemoriesWidget from '../../../components/ui/organisms/MemoriesWidget.jsx'

const MEMORIES = [
  { key: 'm1', label: 'D03 Zweistufig passed→done bei Sprint-Close', linked: true, href: '#' },
  { key: 'm2', label: 'Session-Note 2026-06-15 NAS-Cutover', linked: true, href: '#' },
  { key: 'm3', label: 'ADR Sprint Lifecycle und CLI Harness', linked: true, href: '#' },
  { key: 'm4', label: 'D01 Repo-Doku Single-Source specs-DD', linked: false, href: '#' },
  { key: 'm5', label: 'Capture-Host Allowlist DD-375', linked: false, href: '#' },
]
const SORT_MODES = [{ value: 'recent', label: 'Neueste' }, { value: 'relevance', label: 'Relevanz' }]
const FILTER_MODES = [{ value: 'all', label: 'Alle' }, { value: 'linked', label: 'Nur verknüpfte' }]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/MemoriesWidget',
  component: MemoriesWidget,
  tags: ['status:stable', 'qa_behavioral:done', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: minimaler Default-Props-Zustand (keine Memories → Leer-Hinweis, Add bleibt).
export const Default = {
  render: () => (
    <div data-ui="organism.memories-widget.default" className="max-w-lg">
      <MemoriesWidget />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — verknüpfte Memories als bordered Rows + Add + Metrik (Klon der Default-Gestalt).
export const Main = {
  render: () => (
    <div data-ui="organism.memories-widget.main" className="max-w-lg">
      <MemoriesWidget memories={MEMORIES} sortModes={SORT_MODES} filterModes={FILTER_MODES}
        onToggleLink={fn()} onSearch={fn()} onSort={fn()} onFilter={fn()} />
    </div>
  ),
}

// State_Empty: nichts verknüpft → Leer-Hinweis, Add-Trigger bleibt.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.memories-widget.empty" className="max-w-lg">
      <MemoriesWidget memories={[]} sortModes={SORT_MODES} filterModes={FILTER_MODES} onSearch={fn()} />
    </div>
  ),
}

// Interaction_Pick: Klickpfad (L5) — Add öffnet MemoryForm (Pool + Suche-ghost + Checkboxen).
export const Interaction_Pick = {
  render: () => (
    <div data-ui="organism.memories-widget.picking" className="max-w-lg">
      <MemoriesWidget memories={MEMORIES} sortModes={SORT_MODES} filterModes={FILTER_MODES}
        onToggleLink={fn()} onSearch={fn()} onSort={fn()} onFilter={fn()} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    // Add klicken → MemoryForm öffnet (Pool sichtbar inkl. unverknüpfter m4 + ghost-Suche).
    await userEvent.click(canvas.getByLabelText(/memory verknüpfen/i))
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="memories-widget.form"]')).toBeTruthy())
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="memories-widget.item-m4.link"]')).toBeTruthy())
    expect(canvasElement.querySelector('[data-ui="memories-widget.search.input"]')).toBeTruthy()
  },
}

// Interaction_Unlink: Klickpfad (L5) — Entlinken in der Liste senkt die Metrik (3 → 2).
export const Interaction_Unlink = {
  render: () => {
    const Wrapper = () => {
      const [mem, setMem] = useState(MEMORIES)
      const toggle = (key, next) => setMem((ms) => ms.map((m) => (m.key === key ? { ...m, linked: next } : m)))
      return <MemoriesWidget memories={mem} sortModes={SORT_MODES} filterModes={FILTER_MODES} onToggleLink={toggle} onSearch={fn()} />
    }
    return (
      <div data-ui="organism.memories-widget.interactive" className="max-w-lg">
        <Wrapper />
      </div>
    )
  },
  play: async ({ canvas, canvasElement }) => {
    // Ausgangs-Metrik: 3 verknüpft.
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="memories-widget.count"]')?.textContent).toMatch(/^3 /))
    // m1 entlinken → Metrik sinkt auf 2. (Liste hat mehrere "Verknüpfung lösen" →
    // getAllByRole[0], sonst getMultipleElementsFoundError — CT-Runner-Fund 2026-06-22.)
    await userEvent.click(canvas.getAllByRole('button', { name: /verknüpfung lösen/i })[0])
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="memories-widget.count"]')?.textContent).toMatch(/^2 /))
  },
}
