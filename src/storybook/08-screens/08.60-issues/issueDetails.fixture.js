// IssueDetails — self-contained Screen-Fixture (08.60, Plan-Sekundär-Promotion aus dem
// git-ignored Mockup-Room). Gemappte `data`-Shape des IssueDetails-Organisms (EntityDetail V2),
// realistisch + deterministisch (keine Randomisierung). Geteilt mit der AppShell-08.10-Story
// (Such-Navigationsziel T4) — eine Quelle, kein Drift.
//
// Shape-Wahrheit = der Organism `src/components/ui/organisms/IssueDetails.jsx` (camelCase,
// `blockers→predecessors`, `feedback→reviews`). Anderes Issue zeigen: Felder hier tauschen.

export const ISSUE_DETAIL = {
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

// Root-Minimal (nur Header-Felder, alle Slots leer → Placeholder-Pfad).
export const ISSUE_MINIMAL = {
  id: 'DD-251',
  title: 'Tastatur-Navigation der Issue-Liste',
  priority: 'hoch',
  status: 'to_review',
  type: 'feature',
}

// Mock-Treffer für die AppShell-Such-Demo (T4): leichte Liste, KEIN echter Such-Screen
// (SSTD §7: Such-Results-Surface bleibt out-of-scope bis greenfield Such-Screen). Jeder
// Treffer trägt die issueId für die Navigation `/issues/:id`.
export const SEARCH_HITS = [
  { issueId: 'DD-251', title: 'Tastatur-Navigation der Issue-Liste', type: 'feature' },
  { issueId: 'DD-188', title: 'Multi-Tenant Header-Injection', type: 'chore' },
  { issueId: 'DD-204', title: 'Lifecycle-Validierung härten', type: 'improvement' },
]
