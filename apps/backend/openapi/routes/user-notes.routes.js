import { z } from 'zod';
import { register } from '../registry.js';

// user_notes (DD2-161, ehem. session_notes/T-be1) — Rich-Entity fürs UserNotesWidget.
// Schema spiegelt contracts/userNote.contracts.js (TITLE_MAX 200, DETAILS_MAX 500).

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
  path: '/api/user-notes',
  tag: 'user-notes',
  summary: 'Listet User-Notes des Projekts (optional Volltext-Filter)',
  query: z.object({
    search: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/user-notes/:id',
  tag: 'user-notes',
  summary: 'Einzelne User-Note per id (404 wenn fehlt)',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/user-notes',
  tag: 'user-notes',
  summary: 'User-Note anlegen',
  body: createBody,
  status: 201,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/user-notes/:id',
  tag: 'user-notes',
  summary: 'User-Note bearbeiten (partielles Update)',
  params: z.object({ id: z.string() }),
  body: createBody.partial(),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/user-notes/:id',
  tag: 'user-notes',
  summary: 'User-Note löschen',
  params: z.object({ id: z.string() }),
  res: z.null(),
  status: 204,
});
