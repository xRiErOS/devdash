import { z } from 'zod';
import { register } from '../registry.js';

// DD2-21: documents — Markdown-Dokumente an Meilensteine ODER Sprints (DB-Blob).
// Schema spiegelt contracts/document.contracts.js (TITLE_MAX 200, BODY_MAX 1MB).

const createBody = z.object({
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  file_path: z.string().nullish(),
});

// Owner-Paare: identische Routen für /api/milestones/:id und /api/sprints/:id.
for (const owner of ['milestones', 'sprints']) {
  register({
    method: 'GET',
    path: `/api/${owner}/:id/documents`,
    tag: 'documents',
    summary: `Listet Dokumente eines ${owner === 'milestones' ? 'Meilensteins' : 'Sprints'} (id DESC)`,
    params: z.object({ id: z.string() }),
    res: z.array(z.record(z.string(), z.unknown())),
  });
  register({
    method: 'POST',
    path: `/api/${owner}/:id/documents`,
    tag: 'documents',
    summary: 'Dokument anlegen (DB-Blob body)',
    params: z.object({ id: z.string() }),
    body: createBody,
    status: 201,
    res: z.record(z.string(), z.unknown()),
  });
  register({
    method: 'GET',
    path: `/api/${owner}/:id/documents/:docId`,
    tag: 'documents',
    summary: 'Einzelnes Dokument (404 wenn fehlt/anderer Owner)',
    params: z.object({ id: z.string(), docId: z.string() }),
    res: z.record(z.string(), z.unknown()),
  });
  register({
    method: 'PUT',
    path: `/api/${owner}/:id/documents/:docId`,
    tag: 'documents',
    summary: 'Dokument bearbeiten (partielles Update)',
    params: z.object({ id: z.string(), docId: z.string() }),
    body: createBody.partial(),
    res: z.record(z.string(), z.unknown()),
  });
  register({
    method: 'DELETE',
    path: `/api/${owner}/:id/documents/:docId`,
    tag: 'documents',
    summary: 'Dokument löschen',
    params: z.object({ id: z.string(), docId: z.string() }),
    res: z.null(),
    status: 204,
  });
}
