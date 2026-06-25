import { z } from 'zod';
import { register } from '../registry.js';

// session_notes (T-be1, Modell B) — Rich-Entity fürs SessionNotesWidget.
// Schema spiegelt contracts/sessionNote.contracts.js (TITLE_MAX 200, DETAILS_MAX 500).

const keyArray = z.array(z.string());

const createBody = z.object({
  title: z.string().min(1).max(200),
  details: z.string().max(500).optional(),
  pr_url: z.string().url().nullish(),
  sprints: keyArray.optional(),
  issues: keyArray.optional(),
});

register({
  method: 'GET',
  path: '/api/session-notes',
  tag: 'session-notes',
  summary: 'Listet Session-Notes des Projekts (optional Volltext-Filter)',
  query: z.object({
    search: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/session-notes/:id',
  tag: 'session-notes',
  summary: 'Einzelne Session-Note per id (404 wenn fehlt)',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/session-notes',
  tag: 'session-notes',
  summary: 'Session-Note anlegen',
  body: createBody,
  status: 201,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/session-notes/:id',
  tag: 'session-notes',
  summary: 'Session-Note bearbeiten (partielles Update)',
  params: z.object({ id: z.string() }),
  body: createBody.partial(),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/session-notes/:id',
  tag: 'session-notes',
  summary: 'Session-Note löschen',
  params: z.object({ id: z.string() }),
  res: z.null(),
  status: 204,
});
