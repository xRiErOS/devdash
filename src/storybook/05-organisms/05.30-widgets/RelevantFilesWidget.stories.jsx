/**
 * RelevantFilesWidget — Organism-Story (05.30 Widgets, GF-374 V2). Datei-Links als
 * Zeilen-Liste in der randlosen CaptureWidget-Shell. KEINE Datei-Suche (Cloud-Tool, kein
 * lokales FS, PO 2026-06-19): Add-IconButton hängt eine editierbare Row an (manuelle Erfassung).
 * Interactive = Klickpfad (Add → tippen → Enter → Row, play, L5).
 */
import { useState } from 'react'
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import RelevantFilesWidget from '../../../components/ui/organisms/RelevantFilesWidget.jsx'

const FILES = ['src/views/IssueList.jsx', 'server/api.js']

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/RelevantFilesWidget',
  component: RelevantFilesWidget,
  tags: ['status:stable', 'qa_behavioral:done', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: Zeilen-Liste + Add-IconButton (create-Slot).
export const Default = {
  render: () => (
    <div data-ui="organism.relevant-files-widget.default" className="max-w-md">
      <RelevantFilesWidget onChange={fn()} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Zeilen-Liste + Add-IconButton (Klon der Default-Gestalt).
export const Main = {
  render: () => (
    <div data-ui="organism.relevant-files-widget.main" className="max-w-md">
      <RelevantFilesWidget files={FILES} onChange={fn()} />
    </div>
  ),
}

// State_Empty: keine Pfade → Leer-Hinweis, Add-Trigger bleibt.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.relevant-files-widget.empty" className="max-w-md">
      <RelevantFilesWidget files={[]} onChange={fn()} />
    </div>
  ),
}

// State_ReadOnly: reine Zeilen-Anzeige — kein Add, kein Entfernen.
export const State_ReadOnly = {
  render: () => (
    <div data-ui="organism.relevant-files-widget.read-only" className="max-w-md">
      <RelevantFilesWidget files={FILES} readOnly />
    </div>
  ),
}

// Interaction_Add: Klickpfad (L5) — Add klicken → editierbare Row → Pfad tippen → Enter → neue Row.
export const Interaction_Add = {
  render: () => {
    const Wrapper = () => {
      const [files, setFiles] = useState(['server/api.js'])
      return <RelevantFilesWidget files={files} onChange={setFiles} />
    }
    return (
      <div data-ui="organism.relevant-files-widget.interactive" className="max-w-md">
        <Wrapper />
      </div>
    )
  },
  play: async ({ canvas }) => {
    // 1. Add-Trigger klicken → editierbare Row erscheint.
    await userEvent.click(canvas.getByLabelText(/datei-link hinzufügen/i))
    const input = await waitFor(() => canvas.getByPlaceholderText(/pfad eintippen/i))
    // 2. Pfad tippen + Enter → neue committete Row.
    await userEvent.type(input, 'src/index.css{Enter}')
    await waitFor(() => expect(canvas.getByText('src/index.css')).toBeInTheDocument())
  },
}
