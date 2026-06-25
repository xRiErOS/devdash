import { z } from 'zod';
import { register } from '../registry.js';
import {
  tagCreateContract,
  tagUpdateContract,
  issueTagsContract,
  sprintTagsContract,
  milestoneTagsContract,
} from '../../contracts/tag.contracts.js';

const tagObject = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
});

const entityTagsRes = z.object({ tags: z.array(tagObject) });

register({
  method: 'PUT',
  path: '/api/sprints/:id/tags',
  tag: 'tags',
  summary: 'Sprint-Tags vollständig ersetzen (replace)',
  params: z.object({ id: z.string() }),
  body: sprintTagsContract,
  res: entityTagsRes,
});

register({
  method: 'GET',
  path: '/api/sprints/:id/tags',
  tag: 'tags',
  summary: 'Tags eines Sprints lesen',
  params: z.object({ id: z.string() }),
  res: entityTagsRes,
});

register({
  method: 'PUT',
  path: '/api/milestones/:id/tags',
  tag: 'tags',
  summary: 'Milestone-Tags vollständig ersetzen (replace)',
  params: z.object({ id: z.string() }),
  body: milestoneTagsContract,
  res: entityTagsRes,
});

register({
  method: 'GET',
  path: '/api/milestones/:id/tags',
  tag: 'tags',
  summary: 'Tags eines Milestones lesen',
  params: z.object({ id: z.string() }),
  res: entityTagsRes,
});

register({
  method: 'GET',
  path: '/api/tags',
  tag: 'tags',
  summary: 'Tags des aktiven Projekts mit Usage-Count',
  res: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      color: z.string(),
      created_at: z.string(),
      usage_count: z.number(),
    }),
  ),
});

register({
  method: 'POST',
  path: '/api/tags',
  tag: 'tags',
  summary: 'Neuen Tag im aktiven Projekt anlegen',
  body: tagCreateContract,
  res: z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    created_at: z.string(),
    usage_count: z.number(),
  }),
  status: 201,
});

register({
  method: 'PUT',
  path: '/api/tags/:id',
  tag: 'tags',
  summary: 'Tag umbenennen / Farbe ändern',
  params: z.object({ id: z.string() }),
  body: tagUpdateContract,
  res: z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    created_at: z.string(),
    usage_count: z.number(),
  }),
});

register({
  method: 'DELETE',
  path: '/api/tags/:id',
  tag: 'tags',
  summary: 'Tag löschen (cascading entfernt backlog_tags)',
  params: z.object({ id: z.string() }),
  res: z.object({ ok: z.boolean() }),
});

register({
  method: 'PUT',
  path: '/api/backlog/:id/tags',
  tag: 'tags',
  summary: 'Tags eines Backlog-Items vollständig zuweisen (replace)',
  params: z.object({ id: z.string() }),
  body: issueTagsContract,
  res: entityTagsRes,
});
