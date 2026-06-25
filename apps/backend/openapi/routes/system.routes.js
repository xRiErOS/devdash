import { z } from 'zod';
import { register } from '../registry.js';

register({
  method: 'GET',
  path: '/api/config',
  tag: 'system',
  summary: 'Laufzeit-Konfiguration (Feature-Flags) des DevDashboards.',
  res: z.object({
    archon_enabled: z.boolean(),
  }),
});

register({
  method: 'GET',
  path: '/health',
  tag: 'system',
  summary: 'Liveness-Probe — antwortet ohne DB-Zugriff.',
  res: z.object({
    status: z.string(),
  }),
});

register({
  method: 'GET',
  path: '/ready',
  tag: 'system',
  summary: 'Readiness-Probe — prüft DB-Erreichbarkeit (503 wenn nicht bereit).',
  res: z.object({
    status: z.string(),
  }),
});

register({
  method: 'GET',
  path: '/api/settings',
  tag: 'system',
  summary: 'Alle Settings auflisten (Secrets maskiert).',
  res: z.array(z.object({
    key: z.string(),
    description: z.string().nullable(),
    is_secret: z.boolean(),
    updated_at: z.string().nullable(),
    has_value: z.boolean(),
    value: z.string().nullable(),
  })),
});

register({
  method: 'PUT',
  path: '/api/settings/:key',
  tag: 'system',
  summary: 'Setting setzen oder leeren (value=null/"").',
  params: z.object({
    key: z.string(),
  }),
  body: z.object({
    value: z.string().nullable().optional(),
  }),
  res: z.object({
    key: z.string(),
    description: z.string().nullable(),
    is_secret: z.boolean(),
    updated_at: z.string().nullable(),
    has_value: z.boolean(),
    value: z.string().nullable(),
  }),
});

register({
  method: 'GET',
  path: '/api/dashboard/home',
  tag: 'system',
  summary: 'Projekt-Übersicht für die Dashboard-Startseite (offene Sprints/Milestones/Issues je Projekt).',
  res: z.array(z.object({
    projectId: z.number(),
    name: z.string(),
    color: z.string().nullable(),
    prefix: z.string().nullable(),
    slug: z.string().nullable(),
    openSprints: z.number(),
    openMilestones: z.number(),
    issuesInSprints: z.number(),
    issuesInBacklog: z.number(),
  })),
});

register({
  method: 'POST',
  path: '/api/review/:id/screenshots',
  tag: 'system',
  summary: 'Screenshots zu einer Review-Runde hochladen (multipart files).',
  params: z.object({
    id: z.string(),
  }),
  res: z.array(z.object({
    id: z.number(),
    file_path: z.string(),
  })),
});

register({
  method: 'DELETE',
  path: '/api/screenshots/:id',
  tag: 'system',
  summary: 'Review-Screenshot löschen.',
  params: z.object({
    id: z.string(),
  }),
  res: z.object({
    ok: z.boolean(),
  }),
});

register({
  method: 'DELETE',
  path: '/api/attachments/:id',
  tag: 'system',
  summary: 'Backlog-Attachment löschen (404 wenn nicht vorhanden).',
  params: z.object({
    id: z.string(),
  }),
  res: z.object({
    ok: z.boolean(),
  }),
});

register({
  method: 'GET',
  path: '/api/backlog-export',
  tag: 'system',
  summary: 'Backlog als Markdown oder CSV exportieren (Datei-Download).',
  query: z.object({
    format: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    project_id: z.string().optional(),
  }),
  res: z.string(),
});

register({
  method: 'GET',
  path: '/api/planning-prompt',
  tag: 'system',
  summary: 'Sprint-Planning-Prompt als Markdown rendern (refined Issues + Projektkontext).',
  query: z.object({
    capacity: z.string().optional(),
    files: z.string().optional(),
    project_id: z.string().optional(),
  }),
  res: z.string(),
});

register({
  method: 'GET',
  path: '/api/archon-runs',
  tag: 'system',
  summary: 'Archon-Runs auflisten, optional nach Sprint gefiltert.',
  query: z.object({
    sprint_id: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'PATCH',
  path: '/api/reviews/:id',
  tag: 'system',
  summary: 'Review-Runde aktualisieren (status/comment/notes) mit Edit-Lock-Gate.',
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.string().optional(),
    comment: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/reviews',
  tag: 'system',
  summary: 'Review-Feedback-Runden auflisten, gefiltert nach Backlog/Sprint/Status.',
  query: z.object({
    backlog_id: z.string().optional(),
    sprint_id: z.string().optional(),
    status: z.string().optional(),
    project_id: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});
