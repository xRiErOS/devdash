import { z } from 'zod';
import { register } from '../registry.js';
import {
  milestoneCreateContract,
  milestoneUpdateContract,
  milestoneDependencyContract,
  dodItemCreateContract,
  dodItemUpdateContract,
} from '../../contracts/milestone-sprint.contracts.js';

register({
  method: 'GET',
  path: '/api/milestones',
  tag: 'milestones',
  summary: 'Milestones auflisten (Filter status + include_deferred)',
  query: z.object({
    status: z.string().optional(),
    include_deferred: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/milestones/deferred-stats',
  tag: 'milestones',
  summary: 'Statistik zu zurückgestellten Milestones',
  res: z.object({
    deferred_count: z.number(),
    deferred_sprints_count: z.number(),
    milestones: z.array(z.object({ id: z.number(), name: z.string() })),
  }),
});

register({
  method: 'PATCH',
  path: '/api/milestones/reorder',
  tag: 'milestones',
  summary: 'Milestone-Sortierreihenfolge bulk-updaten',
  body: z.object({ ordered_ids: z.array(z.number()) }),
  res: z.object({ ok: z.boolean(), updated: z.number() }),
});

register({
  method: 'POST',
  path: '/api/milestones',
  tag: 'milestones',
  summary: 'Milestone anlegen',
  body: milestoneCreateContract,
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'GET',
  path: '/api/milestones/:id',
  tag: 'milestones',
  summary: 'Milestone-Detail (Sprints, DoD, Dependencies, Counts)',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/milestones/:id',
  tag: 'milestones',
  summary: 'Milestone aktualisieren',
  params: z.object({ id: z.string() }),
  body: milestoneUpdateContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/milestones/:id/open-issues',
  tag: 'milestones',
  summary: 'Nicht-terminale Issues eines Milestones',
  params: z.object({ id: z.string() }),
  res: z.object({
    milestone: z.record(z.string(), z.unknown()),
    items: z.array(z.record(z.string(), z.unknown())),
  }),
});

register({
  method: 'POST',
  path: '/api/milestones/:id/close-with-issues',
  tag: 'milestones',
  summary: 'Milestone schließen + offene Issues triagieren',
  params: z.object({ id: z.string() }),
  body: z.object({
    target_status: z.string().optional(),
    assignments: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/milestones/:id',
  tag: 'milestones',
  summary: 'Milestone löschen',
  params: z.object({ id: z.string() }),
  res: z.unknown(),
  status: 204,
});

register({
  method: 'PATCH',
  path: '/api/milestones/:id',
  tag: 'milestones',
  summary: 'Milestone deferred-Flag schalten',
  params: z.object({ id: z.string() }),
  body: z.object({ deferred: z.boolean() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/milestones/:id/dependencies',
  tag: 'milestones',
  summary: 'Dependencies eines Milestones (predecessors/successors)',
  params: z.object({ id: z.string() }),
  res: z.object({
    predecessors: z.array(z.record(z.string(), z.unknown())),
    successors: z.array(z.record(z.string(), z.unknown())),
  }),
});

register({
  method: 'POST',
  path: '/api/milestone-dependencies',
  tag: 'milestones',
  summary: 'Milestone-Dependency anlegen',
  body: milestoneDependencyContract,
  res: z.object({
    id: z.number(),
    predecessor_id: z.number(),
    successor_id: z.number(),
  }),
  status: 201,
});

register({
  method: 'DELETE',
  path: '/api/milestone-dependencies/:id',
  tag: 'milestones',
  summary: 'Milestone-Dependency löschen',
  params: z.object({ id: z.string() }),
  res: z.unknown(),
  status: 204,
});

register({
  method: 'GET',
  path: '/api/milestones/:id/activity',
  tag: 'milestones',
  summary: 'Audit-Log-Aktivität eines Milestones',
  params: z.object({ id: z.string() }),
  query: z.object({ limit: z.string().optional() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/milestones/:milestone_id/dod-items',
  tag: 'milestones',
  summary: 'DoD-Items eines Milestones auflisten',
  params: z.object({ milestone_id: z.string() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'POST',
  path: '/api/milestones/:milestone_id/dod-items',
  tag: 'milestones',
  summary: 'DoD-Item anlegen',
  params: z.object({ milestone_id: z.string() }),
  body: dodItemCreateContract,
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'PATCH',
  path: '/api/milestones/:milestone_id/dod-items/reorder',
  tag: 'milestones',
  summary: 'DoD-Items eines Milestones umsortieren',
  params: z.object({ milestone_id: z.string() }),
  body: z.object({ order: z.array(z.number()).optional() }),
  res: z.object({ items: z.array(z.record(z.string(), z.unknown())) }),
});

register({
  method: 'PATCH',
  path: '/api/dod-items/:id',
  tag: 'milestones',
  summary: 'DoD-Item aktualisieren',
  params: z.object({ id: z.string() }),
  body: dodItemUpdateContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/dod-items/:id',
  tag: 'milestones',
  summary: 'DoD-Item löschen',
  params: z.object({ id: z.string() }),
  res: z.unknown(),
  status: 204,
});

register({
  method: 'GET',
  path: '/api/dependencies/graph',
  tag: 'milestones',
  summary: 'Issue-Dependency-Graph (nodes + edges)',
  query: z.object({ sprint_id: z.string().optional() }),
  res: z.object({
    nodes: z.array(z.record(z.string(), z.unknown())),
    edges: z.array(z.record(z.string(), z.unknown())),
  }),
});

register({
  method: 'DELETE',
  path: '/api/dependencies/:id',
  tag: 'milestones',
  summary: 'Issue-Dependency löschen',
  params: z.object({ id: z.string() }),
  res: z.unknown(),
  status: 204,
});
