/**
 * AttachmentsAndMemories — Composer-Story (05.30 Widgets, GF-372 V2). "Relevanter Kontext" aus
 * DREI getrennten Organismen (D09/D03): Anhänge (AttachmentWidget) · Datei-Links
 * (RelevantFilesWidget) · Memories (MemoriesWidget) — border-driven, titellos, je Sektion ein
 * `// `-CommentLabel. Controlled/präsentational. data-ui je Sektion + Organismus (PO 1:1).
 */
import { fn } from 'storybook/test'
import AttachmentsAndMemories from '../../../components/ui/organisms/AttachmentsAndMemories.jsx'

const ATTACHMENTS = [
  { key: 'a1', name: 'screenshot.png', size: '24 KB', href: '#', kind: 'image', previewUrl: 'https://placehold.co/600x360' },
  { key: 'a2', name: 'spec-v2.pdf', size: '180 KB', href: '#', kind: 'file' },
]
const FILES = ['src/views/IssueList.jsx', 'server/api.js']
const MEMORIES = [
  { key: 'm1', label: 'D03 Zweistufig passed→done bei Sprint-Close', linked: true, href: '#' },
  { key: 'm2', label: 'Session-Note 2026-06-15 NAS-Cutover', linked: true, href: '#' },
  { key: 'm3', label: 'ADR Sprint Lifecycle und CLI Harness', linked: true, href: '#' },
  { key: 'm4', label: 'D01 Repo-Doku Single-Source specs-DD', linked: false, href: '#' },
]
const SORT_MODES = [{ value: 'recent', label: 'Neueste' }, { value: 'relevance', label: 'Relevanz' }]
const FILTER_MODES = [{ value: 'all', label: 'Alle' }, { value: 'linked', label: 'Nur verknüpfte' }]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/AttachmentsAndMemories',
  component: AttachmentsAndMemories,
  tags: ['status:stable', 'qa_behavioral:open', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: minimaler No-Args-Zustand — Komponente mit Default-Props (alle Sektionen leer).
export const Default = {
  render: () => (
    <div data-ui="organism.attachments-and-memories.default" className="max-w-xl">
      <AttachmentsAndMemories />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — alle drei Sektionen gefüllt + editierbar (Klon der Default-Gestalt).
export const Main = {
  render: () => (
    <div data-ui="organism.attachments-and-memories.main" className="max-w-xl">
      <AttachmentsAndMemories
        attachments={ATTACHMENTS}
        uploadable
        removableAttachments
        files={FILES}
        memories={MEMORIES}
        memorySortModes={SORT_MODES}
        memoryFilterModes={FILTER_MODES}
        onUpload={fn()}
        onPick={fn()}
        onRemoveAttachment={fn()}
        onFilesChange={fn()}
        onToggleMemoryLink={fn()}
        onMemorySearch={fn()}
        onMemorySort={fn()}
        onMemoryFilter={fn()}
      />
    </div>
  ),
}

// State_ReadOnly: reine Anzeige aller drei Sektionen — keine Affordanzen.
export const State_ReadOnly = {
  render: () => (
    <div data-ui="organism.attachments-and-memories.read-only" className="max-w-xl">
      <AttachmentsAndMemories
        attachments={ATTACHMENTS}
        files={FILES}
        filesReadOnly
        memories={MEMORIES}
      />
    </div>
  ),
}

// Variant_Framed: Border bei der Komposition definiert (framed → rahmt alle drei Organismen). Opt-in;
// Default-Story bleibt randlos (V2: keine unnötigen Linien). Demonstriert die prop-gesteuerte Border.
export const Variant_Framed = {
  render: () => (
    <div data-ui="organism.attachments-and-memories.framed" className="max-w-xl">
      <AttachmentsAndMemories
        framed
        attachments={ATTACHMENTS}
        uploadable
        removableAttachments
        files={FILES}
        memories={MEMORIES}
        memorySortModes={SORT_MODES}
        memoryFilterModes={FILTER_MODES}
        onUpload={fn()}
        onPick={fn()}
        onRemoveAttachment={fn()}
        onFilesChange={fn()}
        onToggleMemoryLink={fn()}
        onMemorySearch={fn()}
        onMemorySort={fn()}
        onMemoryFilter={fn()}
      />
    </div>
  ),
}

// State_Empty: alle drei Sektionen leer → Platzhalter je Sektion + Affordanzen für Erst-Erfassung.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.attachments-and-memories.empty" className="max-w-xl">
      <AttachmentsAndMemories
        attachments={[]}
        files={[]}
        memories={[]}
        memorySortModes={SORT_MODES}
        memoryFilterModes={FILTER_MODES}
        uploadable
        onUpload={fn()}
        onPick={fn()}
        onFilesChange={fn()}
        onToggleMemoryLink={fn()}
        onMemorySearch={fn()}
      />
    </div>
  ),
}
