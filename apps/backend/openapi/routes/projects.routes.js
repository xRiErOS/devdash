import { z } from 'zod';
import { register } from '../registry.js';
import { slotSetContract, slotEditContract } from '@devd/api-types/sstd.contracts.js';
import { todoCreateContract, todoUpdateContract, todoLinkContract } from '@devd/api-types/todo.contracts.js';

const projectRow = z.record(z.string(), z.unknown());

register({
  method: 'GET',
  path: '/api/projects',
  tag: 'projects',
  summary: 'Nicht-archivierte Projekte mit Sprint-/Backlog-Counts (Compact-Default)',
  res: z.array(projectRow),
});

register({
  method: 'GET',
  path: '/api/projects/list-minimal',
  tag: 'projects',
  summary: 'Minimale Projektliste (id/name/prefix/slug/color) für PWA-Capture-Dropdown',
  res: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      prefix: z.string(),
      slug: z.string(),
      color: z.string(),
    }),
  ),
});

register({
  method: 'GET',
  path: '/api/projects/by-slug/:slug/capture',
  tag: 'projects',
  summary: 'Capture-Meta eines Projekts per Slug (host-gescopt)',
  params: z.object({ slug: z.string() }),
  res: z.object({
    id: z.number(),
    name: z.string(),
    prefix: z.string(),
    slug: z.string(),
    color: z.string(),
  }),
});

register({
  method: 'GET',
  path: '/api/projects/:id/files',
  tag: 'projects',
  summary: 'Dateien eines Projekts auflisten (optional gefiltert)',
  params: z.object({ id: z.string() }),
  query: z.object({ q: z.string().optional() }),
  res: z.object({
    files: z.array(z.string()),
    total: z.number(),
  }),
});

register({
  method: 'GET',
  path: '/api/projects/:id',
  tag: 'projects',
  summary: 'Einzelnes Projekt mit Counts (id oder slug)',
  params: z.object({ id: z.string() }),
  res: projectRow,
});

register({
  method: 'POST',
  path: '/api/projects',
  tag: 'projects',
  summary: 'Projekt anlegen',
  body: z.object({
    slug: z.string(),
    name: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    prefix: z.string(),
    repo_path: z.string().optional(),
  }),
  res: projectRow,
  status: 201,
});

register({
  method: 'PUT',
  path: '/api/projects/:id',
  tag: 'projects',
  summary: 'Projekt-Felder editieren',
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    archived: z.unknown().optional(),
    storybook_url: z.string().optional(),
    repo_path: z.string().optional(),
    docs_path: z.string().optional(),
    context_file_path: z.string().optional(),
    public_capture: z.boolean().optional(),
    summary_achieved: z.string().optional(),
    summary_next: z.string().optional(),
    vision: z.string().optional(),
    goals: z.string().optional(),
  }),
  res: projectRow,
});

register({
  method: 'GET',
  path: '/api/projects/:id/sstd',
  tag: 'projects',
  summary: 'SSTD eines Projekts (reassembliert aus Slots)',
  params: z.object({ id: z.string() }),
  res: z.object({
    project_id: z.number(),
    sstd_content: z.string().nullable(),
    sstd_updated_at: z.string().nullable(),
  }),
});

register({
  method: 'GET',
  path: '/api/projects/:id/sstd/slots',
  tag: 'projects',
  summary: 'Alle SSTD-Slots eines Projekts auflisten',
  params: z.object({ id: z.string() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/projects/:id/sstd/projections',
  tag: 'projects',
  summary: 'SSTD-Read-Only-Projektionen (Nächste Schritte + Journal)',
  params: z.object({ id: z.string() }),
  res: z.object({
    next_steps: z.string(),
    journal: z.string(),
  }),
});

register({
  method: 'GET',
  path: '/api/projects/:id/sstd/slots/:key',
  tag: 'projects',
  summary: 'Einzelnen SSTD-Slot lesen',
  params: z.object({ id: z.string(), key: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/projects/:id/sstd/slots/:key',
  tag: 'projects',
  summary: 'SSTD-Slot komplett neu schreiben (last-write-wins)',
  params: z.object({ id: z.string(), key: z.string() }),
  body: slotSetContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PATCH',
  path: '/api/projects/:id/sstd/slots/:key/line',
  tag: 'projects',
  summary: 'SSTD-Slot Line-Op (patch/insert/delete, --expect-guarded)',
  params: z.object({ id: z.string(), key: z.string() }),
  body: slotEditContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/projects/:id/sstd',
  tag: 'projects',
  summary: 'SSTD Legacy-Blob whole-rewrite (deprecated)',
  params: z.object({ id: z.string() }),
  body: z.object({ sstd_content: z.string().nullable() }),
  res: z.object({
    project_id: z.number(),
    sstd_content: z.string().nullable(),
    sstd_updated_at: z.string().nullable(),
  }),
  deprecated: true,
});

register({
  method: 'DELETE',
  path: '/api/projects/:id',
  tag: 'projects',
  summary: 'Projekt löschen (nur wenn leer, nicht Initial-Projekt)',
  params: z.object({ id: z.string() }),
  res: z.null(),
  status: 204,
});

register({
  method: 'GET',
  path: '/api/projects/:pid/issues/by-number/:n',
  tag: 'projects',
  summary: 'Issue eines Projekts per Projekt-Nummer auflösen',
  params: z.object({ pid: z.string(), n: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PATCH',
  path: '/api/projects/:project_id/todos/reorder',
  tag: 'projects',
  summary: 'Project-Todos neu sortieren',
  params: z.object({ project_id: z.string() }),
  body: z.object({ order: z.array(z.number()) }),
  res: z.object({ updated: z.number() }),
});

register({
  method: 'GET',
  path: '/api/projects/:project_id/todos',
  tag: 'projects',
  summary: 'Project-Todos auflisten (optional nach Status gefiltert)',
  params: z.object({ project_id: z.string() }),
  query: z.object({ status: z.string().optional() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'POST',
  path: '/api/projects/:project_id/todos',
  tag: 'projects',
  summary: 'Project-Todo anlegen',
  params: z.object({ project_id: z.string() }),
  body: todoCreateContract,
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'PATCH',
  path: '/api/projects/:project_id/todos/:id',
  tag: 'projects',
  summary: 'Project-Todo editieren',
  params: z.object({ project_id: z.string(), id: z.string() }),
  body: todoUpdateContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/projects/:project_id/todos/:id',
  tag: 'projects',
  summary: 'Project-Todo löschen',
  params: z.object({ project_id: z.string(), id: z.string() }),
  res: z.null(),
  status: 204,
});

register({
  method: 'POST',
  path: '/api/projects/:project_id/todos/:tid/links',
  tag: 'projects',
  summary: 'Link zu einem Project-Todo hinzufügen',
  params: z.object({ project_id: z.string(), tid: z.string() }),
  body: todoLinkContract,
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'DELETE',
  path: '/api/projects/:project_id/todos/:tid/links/:lid',
  tag: 'projects',
  summary: 'Link eines Project-Todos entfernen',
  params: z.object({ project_id: z.string(), tid: z.string(), lid: z.string() }),
  res: z.null(),
  status: 204,
});

register({
  method: 'GET',
  path: '/api/projects/:project_id/sstd-sources',
  tag: 'projects',
  summary: 'SSTD-Quellen eines Projekts',
  params: z.object({ project_id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/projects/:project_id/sstd-sources/refresh',
  tag: 'projects',
  summary: 'SSTD-Source-Cache eines Projekts leeren',
  params: z.object({ project_id: z.string() }),
  res: z.object({
    cleared: z.boolean(),
    project_id: z.number(),
  }),
});
