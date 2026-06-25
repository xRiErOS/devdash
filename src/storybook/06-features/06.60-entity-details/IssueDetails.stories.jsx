/**
 * IssueDetails — Feature-Story (06.60 EntityDetails, GF-429). Issue-Variante der EntityDetail V2 (Terminal).
 * Voll-Komposition (PO 2026-06-20): ALLE 05.30-Organismen verdrahtet, kanonische
 * entity-detail.slot.*-Anker je Scope, headless UserStoriesWidget im children-Slot.
 * Referenzfall für ReviewFlow/Sprint/MilestoneDetails. Demo-Daten realistisch.
 * Verschoben aus 05 ORGANISMS/05.70 EntityDetails (GF-429).
 */
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import IssueDetails from '../../../components/ui/organisms/IssueDetails.jsx'
import ContentBlock from '../../../components/ui/organisms/ContentBlock.jsx'
import ContentBlockForm from '../../../components/ui/organisms/ContentBlockForm.jsx'

const DATA = {
  id: 'DD-251',
  title: 'Tastatur-Navigation der Issue-Liste',
  goal: 'Power-User steuern die Issue-Liste vollständig per Tastatur — ohne Maus, ohne Kontextwechsel.',
  priority: 'hoch',
  status: 'to_review',
  type: 'feature',
  description: [
    { key: 'goal', label: 'Goal', value: 'Nutzer navigiert die Issue-Liste per Tastatur — Pfeiltasten bewegen die Auswahl, Enter öffnet das Detail.' },
    { key: 'background', label: 'Background', value: 'Bestehende Liste hat keine Keyboard-Steuerung; Power-User verlieren Zeit mit der Maus. Linear/Raycast setzen den Standard.' },
  ],
  poNotes: [
    { key: 'po', label: 'PO-Notes', value: 'Fokus-Ring klar sichtbar halten (a11y). Scope: nur Liste, nicht das Board.' },
  ],
  contextNotes: [
    { key: 'ctx', label: 'Kontext (KI-Brief)', value: 'Tastatur-Handler in IssueList.jsx; vgl. AppShellRail-Fokus-Logik. Keine externen Libs.' },
  ],
  meta: [
    ['ID', 'DD-251'], ['Status', 'to_review'], ['Priorität', 'hoch'],
    ['Sprint', 'DD#62'], ['Owner', 'Erik'], ['Punkte', '5'],
  ],
  transitions: [
    { key: 'passed', label: 'Bestanden', variant: 'success' },
    { key: 'rejected', label: 'Abgelehnt', variant: 'danger' },
    { key: 'planned', label: 'Zurück in Sprint', variant: 'secondary' },
  ],
  reviews: [
    {
      id: 2, review_status: 'not_passed', created_at: '2026-06-15T11:00:00',
      notes: 'Mehrfachauswahl fehlt noch — bitte nachziehen.',
      userStories: [
        { key: 'us1', title: 'Tastatur-Navigation', verdict: 'accepted' },
        { key: 'us2', title: 'Statusfilter per Kürzel', verdict: 'accepted' },
        { key: 'us3', title: 'Mehrfachauswahl', verdict: 'rejected' },
      ],
    },
  ],
  dependencies: {
    predecessors: [
      { key: 'DD-100', label: 'API-Client Header-Injection', status: 'done' },
      { key: 'DD-101', label: 'Lifecycle-Validierung', status: 'active' },
    ],
    successors: [
      { key: 'DD-200', label: 'Detail-View Verdrahtung', status: 'refined' },
    ],
  },
  tags: [
    { value: 'frontend', label: 'frontend', color: 'blue' },
    { value: 'a11y', label: 'a11y', color: 'green' },
  ],
  tagOptions: [
    { value: 'frontend', label: 'frontend', color: 'blue', meta: '12×' },
    { value: 'a11y', label: 'a11y', color: 'green', meta: '5×' },
    { value: 'bug', label: 'bug', color: 'red', meta: '8×' },
    { value: 'backend', label: 'backend', color: 'peach', meta: '9×' },
  ],
  userStories: [
    { key: 'us1', title: 'Tastatur-Navigation der Issue-Liste', details: 'Pfeiltasten bewegen die Auswahl, Enter öffnet das Detail.', qa: 'Fokus sichtbar; ESC schließt.', verdict: 'accepted' },
    { key: 'us2', title: 'Statusfilter per Tastenkürzel', details: 'Taste 1–5 setzt den Statusfilter.', qa: 'Esc setzt zurück.', verdict: 'accepted' },
    { key: 'us3', title: 'Mehrfachauswahl von Issues', details: 'Shift-Klick markiert eine Spanne.', verdict: 'rejected' },
  ],
  attachments: [
    { key: 'a1', name: 'screenshot.png', size: '24 KB', href: '#', kind: 'image' },
    { key: 'a2', name: 'spec-v2.pdf', size: '180 KB', href: '#', kind: 'file' },
  ],
  files: ['src/views/IssueList.jsx', 'server/api.js'],
  memories: [
    { key: 'm1', label: 'D03 Zweistufig passed→done bei Sprint-Close', linked: true, href: '#' },
    { key: 'm2', label: 'ADR Sprint Lifecycle und CLI Harness', linked: true, href: '#' },
    { key: 'm3', label: 'D01 Repo-Doku Single-Source specs-DD', linked: false, href: '#' },
  ],
  activity: [
    { id: 1, action: 'create', timestamp: '2026-06-14 09:00:00', agent_id: 'claude-opus' },
    { id: 2, action: 'status_change', old_value: 'refined', new_value: 'in_progress', timestamp: '2026-06-14 10:30:00', agent_id: 'archon-runner' },
    { id: 3, action: 'sprint_assign', old_value: '·', new_value: 'DD#62', timestamp: '2026-06-15 08:00:00' },
    { id: 4, action: 'edit', timestamp: '2026-06-15 11:00:00', agent_id: 'claude-opus' },
  ],
}

const meta = {
  title: '06 FEATURES/06.60 Entity Details/IssueDetails',
  component: IssueDetails,
  tags: ['status:review', 'qa_behavioral:done', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
}
export default meta

// Root-Minimal (Default-Props): nur Header-Felder, alle Slots leer → Placeholder-Pfad.
const MINIMAL = {
  id: 'DD-251',
  title: 'Tastatur-Navigation der Issue-Liste',
  priority: 'hoch',
  status: 'to_review',
  type: 'feature',
}

export const Default = {
  render: () => <div data-ui="organism.issue-details.default"><IssueDetails data={MINIMAL} /></div>,
}

export const Main = {
  render: () => <div data-ui="organism.issue-details.main"><IssueDetails data={DATA} /></div>,
}

function DescriptionEditDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div data-ui="organism.issue-details.description-edit" className="max-w-2xl p-6">
      <ContentBlock
        blocks={DATA.description}
        heading="Beschreibung"
        onEdit={() => setOpen(true)}
      />
      <ContentBlockForm
        open={open}
        onClose={() => setOpen(false)}
        blocks={DATA.description}
        onSave={() => setOpen(false)}
        headerLabel="Beschreibung bearbeiten"
      />
    </div>
  )
}

export const Interaction_DescriptionEdit = {
  render: () => <DescriptionEditDemo />,
  play: async ({ canvasElement }) => {
    const editBtn = canvasElement.querySelector('[data-ui="content-block.block-goal.edit"]')
    await expect(editBtn).not.toBeNull()
    await userEvent.click(editBtn)
    const overlay = within(document.body)
    await expect(await overlay.findByText('Beschreibung bearbeiten')).toBeVisible()
  },
}
