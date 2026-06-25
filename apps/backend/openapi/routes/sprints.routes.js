import { z } from 'zod';
import { register } from '../registry.js';
import {
  sprintCreateContract,
  sprintUpdateContract,
  sprintReorderContract,
  sprintDependencyContract,
} from '@devd/api-types/milestone-sprint.contracts.js';

register({
  method: 'GET',
  path: '/api/sprints',
  tag: 'sprints',
  summary: 'Sprints auflisten',
  query: z.object({
    status: z.string().optional(),
    milestone_id: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/sprints/:id',
  tag: 'sprints',
  summary: 'Sprint mit Issues abrufen',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/sprints/:id/review-submit',
  tag: 'sprints',
  summary: 'Sprint zur Review einreichen',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/sprints/:id/context',
  tag: 'sprints',
  summary: 'Sprint-Kontext (JSON oder Markdown)',
  params: z.object({ id: z.string() }),
  query: z.object({ format: z.string().optional() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/sprints/:id/screenshots',
  tag: 'sprints',
  summary: 'Screenshot-Bundle eines Sprints',
  params: z.object({ id: z.string() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/sprints/:id/rev-results',
  tag: 'sprints',
  summary: 'Review-Ergebnisse eines Sprints',
  params: z.object({ id: z.string() }),
  res: z.array(
    z.object({
      key: z.string().nullable(),
      title: z.string(),
      status: z.string(),
      review_status: z.string().nullable(),
      comment: z.string().nullable(),
      screenshot_files: z.array(
        z.object({
          id: z.number(),
          file_path: z.string(),
          url: z.string(),
        }),
      ),
    }),
  ),
});

register({
  method: 'GET',
  path: '/api/sprints/:id/dependencies',
  tag: 'sprints',
  summary: 'Abhängigkeiten eines Sprints',
  params: z.object({ id: z.string() }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'POST',
  path: '/api/sprint-dependencies',
  tag: 'sprints',
  summary: 'Sprint-Abhängigkeit anlegen',
  body: sprintDependencyContract,
  res: z.object({
    id: z.number(),
    predecessor_id: z.number(),
    successor_id: z.number(),
  }),
  status: 201,
});

register({
  method: 'DELETE',
  path: '/api/sprint-dependencies/:id',
  tag: 'sprints',
  summary: 'Sprint-Abhängigkeit löschen',
  params: z.object({ id: z.string() }),
  res: z.null(),
  status: 204,
});

register({
  method: 'GET',
  path: '/api/sprints/:id/completeness',
  tag: 'sprints',
  summary: 'Completeness eines Sprints',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/sprints/:id/activity',
  tag: 'sprints',
  summary: 'Activity-Log eines Sprints',
  params: z.object({ id: z.string() }),
  query: z.object({ limit: z.string().optional() }),
  res: z.array(
    z.object({
      id: z.number(),
      timestamp: z.string(),
      agent_id: z.string().nullable(),
      action: z.string(),
      old_value: z.string().nullable(),
      new_value: z.string().nullable(),
    }),
  ),
});

register({
  method: 'POST',
  path: '/api/sprints',
  tag: 'sprints',
  summary: 'Sprint anlegen',
  body: sprintCreateContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PATCH',
  path: '/api/sprints/reorder',
  tag: 'sprints',
  summary: 'Sprints neu sortieren',
  body: sprintReorderContract,
  res: z.object({
    success: z.boolean(),
    sprints: z.array(z.record(z.string(), z.unknown())),
  }),
});

register({
  method: 'PUT',
  path: '/api/sprints/:id',
  tag: 'sprints',
  summary: 'Sprint aktualisieren',
  params: z.object({ id: z.string() }),
  body: sprintUpdateContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/sprints/:id',
  tag: 'sprints',
  summary: 'Sprint löschen',
  params: z.object({ id: z.string() }),
  res: z.object({
    ok: z.boolean(),
    deleted_id: z.number(),
  }),
});

register({
  method: 'GET',
  path: '/api/sprints/:id/export',
  tag: 'sprints',
  summary: 'Sprint exportieren (md/csv)',
  params: z.object({ id: z.string() }),
  query: z.object({ format: z.string().optional() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/sprints/:id/complete',
  tag: 'sprints',
  summary: 'Sprint abschließen',
  params: z.object({ id: z.string() }),
  query: z.object({ force: z.string().optional() }),
  body: z.object({ force: z.boolean().optional() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PATCH',
  path: '/api/sprints/:id/status',
  tag: 'sprints',
  summary: 'Sprint-Status-Übergang',
  params: z.object({ id: z.string() }),
  body: z.object({
    to: z.string(),
    cancellationNotes: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/sprints/:id/run-archon',
  tag: 'sprints',
  summary: 'Archon-Run für Sprint starten',
  params: z.object({ id: z.string() }),
  res: z.object({
    run_id: z.string(),
    status: z.string(),
  }),
});

register({
  method: 'POST',
  path: '/api/sprints/:id/submit-feedback',
  tag: 'sprints',
  summary: 'Archon-Feedback einreichen',
  params: z.object({ id: z.string() }),
  body: z.object({
    run_id: z.string(),
    feedback_items: z.array(z.record(z.string(), z.unknown())),
  }),
  res: z.object({
    action: z.string(),
    run_id: z.string(),
  }),
});

register({
  method: 'GET',
  path: '/api/sprints/:id/active-run',
  tag: 'sprints',
  summary: 'Aktiver Archon-Run eines Sprints',
  params: z.object({ id: z.string() }),
  res: z
    .object({
      run_id: z.string(),
      status: z.string(),
    })
    .nullable(),
});
