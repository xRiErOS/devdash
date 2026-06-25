// OpenAPI-Route-Registry — Tag "backlog" (Issues, Subtasks, User-Stories, Tasks,
// Attachments, Dependencies, Reviews). Generiert aus server/api.js-Handlern.
//
// Bindungen zu den autoritativen Contracts (contracts/*.contracts.js) dort, wo der
// Handler bereits einen Contract sourct oder dessen Struktur exakt spiegelt; sonst
// inline z.object aus dem Handler-Body abgeleitet.

import { z } from 'zod';
import { register } from '../registry.js';
import {
  issueCreateContract,
  issueUpdateContract,
  issueStatusContract,
  issueAssignSprintContract,
  issueDependencyContract,
  backlogBulkContract,
  backlogMoveContract,
} from '@devd/api-types/backlog.contracts.js';
import {
  subtaskCreateContract,
  subtaskEditContract,
  subtaskStatusContract,
  subtaskReorderContract,
} from '@devd/api-types/subtask.contracts.js';
import {
  userStoryCreateContract,
  userStoryUpdateContract,
  userStoryVerdictContract,
} from '@devd/api-types/userStory.contracts.js';

// Wiederverwendete Response-Bausteine.
const backlogItem = z.record(z.string(), z.unknown());
const subtaskRow = z.record(z.string(), z.unknown());
const userStoryRow = z.record(z.string(), z.unknown());

// --- Issues (Liste / Lost / Detail) ---

register({
  method: 'GET',
  path: '/api/backlog',
  tag: 'backlog',
  summary: 'Backlog-Liste des aktiven Projekts (Filter + Suche, Compact-Default)',
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    sprint_id: z.string().optional(),
    type: z.string().optional(),
    fields: z.string().optional(),
  }),
  res: z.array(backlogItem),
});

register({
  method: 'PATCH',
  path: '/api/backlog/bulk',
  tag: 'backlog',
  summary: 'Bulk-Operationen auf mehreren Issues (set_status/set_sprint/cancel/...)',
  body: backlogBulkContract,
  res: z.object({ ok: z.array(z.number()), failed: z.array(z.object({ id: z.number(), reason: z.string() })) }),
});

register({
  method: 'GET',
  path: '/api/backlog/lost',
  tag: 'backlog',
  summary: 'Lost-Issues — offene Items in bereits abgeschlossenen Sprints',
  res: z.array(backlogItem),
});

register({
  method: 'GET',
  path: '/api/backlog/:id',
  tag: 'backlog',
  summary: 'Einzelnes Issue (angereichert) über globale backlog.id',
  params: z.object({ id: z.string() }),
  res: backlogItem,
});

// --- Subtasks ---

register({
  method: 'GET',
  path: '/api/backlog/:id/subtasks',
  tag: 'backlog',
  summary: 'Subtasks eines Issues auflisten',
  params: z.object({ id: z.string() }),
  res: z.array(subtaskRow),
});

register({
  method: 'POST',
  path: '/api/backlog/:id/subtasks',
  tag: 'backlog',
  summary: 'Subtask zu einem Issue anlegen',
  params: z.object({ id: z.string() }),
  body: subtaskCreateContract,
  res: subtaskRow,
  status: 201,
});

register({
  method: 'PATCH',
  path: '/api/subtasks/:id',
  tag: 'backlog',
  summary: 'Subtask bearbeiten (Partial-Update)',
  params: z.object({ id: z.string() }),
  body: subtaskEditContract,
  res: subtaskRow,
});

register({
  method: 'PATCH',
  path: '/api/subtasks/:id/status',
  tag: 'backlog',
  summary: 'Subtask-Status setzen (open/done)',
  params: z.object({ id: z.string() }),
  body: subtaskStatusContract,
  res: subtaskRow,
});

register({
  method: 'DELETE',
  path: '/api/subtasks/:id',
  tag: 'backlog',
  summary: 'Subtask löschen',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/backlog/:id/subtasks/order',
  tag: 'backlog',
  summary: 'Subtasks eines Issues neu sortieren (Batch-Reorder)',
  params: z.object({ id: z.string() }),
  body: subtaskReorderContract,
  res: z.array(subtaskRow),
});

// --- User Stories ---

register({
  method: 'GET',
  path: '/api/backlog/:id/user-stories',
  tag: 'backlog',
  summary: 'User-Stories eines Issues auflisten',
  params: z.object({ id: z.string() }),
  res: z.array(userStoryRow),
});

register({
  method: 'POST',
  path: '/api/backlog/:id/user-stories',
  tag: 'backlog',
  summary: 'User-Story zu einem Issue anlegen',
  params: z.object({ id: z.string() }),
  body: userStoryCreateContract,
  res: userStoryRow,
  status: 201,
});

register({
  method: 'PATCH',
  path: '/api/user-stories/:id',
  tag: 'backlog',
  summary: 'User-Story bearbeiten (Partial-Update)',
  params: z.object({ id: z.string() }),
  body: userStoryUpdateContract,
  res: userStoryRow,
});

register({
  method: 'PATCH',
  path: '/api/user-stories/:id/verdict',
  tag: 'backlog',
  summary: 'User-Story-Verdict setzen (open/accepted/rejected)',
  params: z.object({ id: z.string() }),
  body: userStoryVerdictContract,
  res: userStoryRow,
});

register({
  method: 'DELETE',
  path: '/api/user-stories/:id',
  tag: 'backlog',
  summary: 'User-Story löschen',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

// --- Issue PO-Notes / Attachments / Tasks ---

register({
  method: 'PATCH',
  path: '/api/backlog/:id',
  tag: 'backlog',
  summary: 'PO-Notes eines Issues aktualisieren',
  params: z.object({ id: z.string() }),
  body: z.object({
    notes: z.string().nullish(),
    po_notes: z.string().nullish(),
  }),
  res: backlogItem,
});

register({
  method: 'POST',
  path: '/api/backlog/:id/attachments',
  tag: 'backlog',
  summary: 'Bild-Anhänge zu einem Issue hochladen (multipart/form-data)',
  params: z.object({ id: z.string() }),
  res: z.array(z.object({
    id: z.number(),
    file_path: z.string(),
    mime_type: z.string().nullable(),
  })),
  status: 201,
});

register({
  method: 'POST',
  path: '/api/backlog/:id/tasks',
  tag: 'backlog',
  summary: 'Task (DD-22) zu einem Issue anlegen',
  params: z.object({ id: z.string() }),
  body: z.object({
    title: z.string(),
    effort: z.coerce.number().nullish(),
  }),
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'PUT',
  path: '/api/tasks/:id',
  tag: 'backlog',
  summary: 'Task bearbeiten (title/status/effort)',
  params: z.object({ id: z.string() }),
  body: z.object({
    title: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'blocked', 'done']).optional(),
    effort: z.coerce.number().nullish().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/tasks/:id',
  tag: 'backlog',
  summary: 'Task löschen',
  params: z.object({ id: z.string() }),
  res: z.object({ ok: z.boolean() }),
});

// --- Issue create / edit / status / sprint / delete / move ---

register({
  method: 'POST',
  path: '/api/backlog',
  tag: 'backlog',
  summary: 'Neues Issue erstellen',
  body: issueCreateContract,
  res: backlogItem,
  status: 201,
});

register({
  method: 'PUT',
  path: '/api/backlog/:id',
  tag: 'backlog',
  summary: 'Issue-Felder bearbeiten (nicht Status/Sprint)',
  params: z.object({ id: z.string() }),
  body: issueUpdateContract,
  res: backlogItem,
});

register({
  method: 'PATCH',
  path: '/api/backlog/:id/status',
  tag: 'backlog',
  summary: 'Issue-Status-Transition (Lifecycle-validiert)',
  params: z.object({ id: z.string() }),
  body: issueStatusContract,
  res: backlogItem,
});

register({
  method: 'PATCH',
  path: '/api/backlog/:id/sprint',
  tag: 'backlog',
  summary: 'Issue einem Sprint zuordnen oder lösen',
  params: z.object({ id: z.string() }),
  body: issueAssignSprintContract,
  res: backlogItem,
});

register({
  method: 'DELETE',
  path: '/api/backlog/:id',
  tag: 'backlog',
  summary: 'Issue hart löschen (?force=1) — sonst 409 (cancel-Pfad nutzen)',
  params: z.object({ id: z.string() }),
  query: z.object({ force: z.string().optional() }),
  res: z.record(z.string(), z.unknown()),
  status: 204,
});

register({
  method: 'POST',
  path: '/api/backlog/:id/move',
  tag: 'backlog',
  summary: 'Issue in ein anderes Projekt verschieben',
  params: z.object({ id: z.string() }),
  body: backlogMoveContract,
  res: backlogItem,
});

// --- Activity / Dependencies ---

register({
  method: 'GET',
  path: '/api/backlog/:id/activity',
  tag: 'backlog',
  summary: 'Audit-Log-Aktivität eines Issues',
  params: z.object({ id: z.string() }),
  query: z.object({ limit: z.string().optional() }),
  res: z.array(z.object({
    id: z.number(),
    timestamp: z.string(),
    agent_id: z.string().nullable(),
    action: z.string(),
    old_value: z.string().nullable(),
    new_value: z.string().nullable(),
  })),
});

register({
  method: 'GET',
  path: '/api/backlog/:id/dependencies',
  tag: 'backlog',
  summary: 'Dependencies eines Issues auflisten',
  params: z.object({ id: z.string() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'POST',
  path: '/api/backlog/:id/dependencies',
  tag: 'backlog',
  summary: 'Dependency zu einem Issue hinzufügen (Zyklus-geschützt)',
  params: z.object({ id: z.string() }),
  body: issueDependencyContract,
  res: z.record(z.string(), z.unknown()),
});

// --- Reviews ---

register({
  method: 'POST',
  path: '/api/backlog/:id/reviews',
  tag: 'backlog',
  summary: 'Review-Runde zu einem Issue anlegen (optional mit Verdict)',
  params: z.object({ id: z.string() }),
  body: z.object({
    notes: z.string().nullish(),
    review_status: z.enum(['passed', 'not_passed', 'pending']).optional(),
    comment: z.string().nullish(),
  }),
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'POST',
  path: '/api/backlog/:id/review/reopen',
  tag: 'backlog',
  summary: 'Review eines to_review-Issues wieder öffnen (frische pending-Runde)',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/backlog/:id/reviews',
  tag: 'backlog',
  summary: 'Alle Review-Runden eines Issues (inkl. Screenshots)',
  params: z.object({ id: z.string() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

// DD-222 / DD-270 / DD-392: öffentlicher PWA-Capture-Endpoint (multipart/form-data,
// optionales Foto + Felder, X-API-Key, public_capture-Gate). Vom Manifest-Grep
// zunächst übersehen (Whitespace nach `app.post(`), via Drift-Gate nachgezogen.
register({
  method: 'POST',
  path: '/api/issues',
  tag: 'backlog',
  summary: 'Issue via öffentlichem PWA-Capture anlegen (multipart, optional Foto)',
  contentType: 'multipart/form-data',
  body: z.object({
    project_id: z.number().int().min(1),
    title: z.string().min(3).max(200),
    description: z.string().max(5000).optional(),
    type: z.enum(['bug', 'feature', 'improvement', 'core']).optional(),
    photo: z.string().optional(),
  }),
  res: z.object({ id: z.number(), key: z.string() }),
  status: 201,
});
