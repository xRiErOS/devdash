import { z } from 'zod';
import { register } from '../registry.js';

register({
  method: 'GET',
  path: '/api/sops',
  tag: 'sops',
  summary: 'Listet alle SOPs (Key + Titel + Metadaten)',
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/sops/triggered',
  tag: 'sops',
  summary: 'SOPs zu einem Trigger auflösen (z.B. sprint:start)',
  query: z.object({
    trigger: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/sops/bundle',
  tag: 'sops',
  summary: 'SOP-Bundle: getriggerte SOPs + Sprint-Header + Issues + rendered Markdown',
  query: z.object({
    trigger: z.string().optional(),
    sprint: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/sops/:key',
  tag: 'sops',
  summary: 'Einzelne SOP per Key abrufen',
  params: z.object({
    key: z.string(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/sops',
  tag: 'sops',
  summary: 'SOP anlegen oder aktualisieren (Upsert)',
  body: z.object({
    sop_key: z.string(),
    title: z.string(),
    content: z.string().optional(),
    source_path: z.string().optional(),
  }),
  status: 201,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/sops/:key',
  tag: 'sops',
  summary: 'Bestehende SOP im DB-Master editieren (content und/oder title)',
  params: z.object({
    key: z.string(),
  }),
  body: z.object({
    content: z.string().optional(),
    title: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PATCH',
  path: '/api/sops/:key/line',
  tag: 'sops',
  summary: 'Token-effizienter Zeilen-Patch einer SOP (guarded via expect)',
  params: z.object({
    key: z.string(),
  }),
  body: z.object({
    op: z.enum(['patch', 'insert_after', 'insert_before', 'delete']),
    line: z.number(),
    content: z.string().optional(),
    expect: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

// SOP-Collections (T-be2) — geordnete SOP-Bündel + Markdown-Export.

register({
  method: 'GET',
  path: '/api/sop-collections',
  tag: 'sops',
  summary: 'Listet alle SOP-Collections',
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/sop-collections/:key',
  tag: 'sops',
  summary: 'SOP-Collection per Key inkl. voller SOPs (404 wenn fehlt)',
  params: z.object({
    key: z.string(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/sop-collections/:key/export',
  tag: 'sops',
  summary: 'Markdown-Export-Bundle einer SOP-Collection (404 wenn fehlt)',
  params: z.object({
    key: z.string(),
  }),
  res: z.string(),
});

register({
  method: 'POST',
  path: '/api/sop-collections',
  tag: 'sops',
  summary: 'SOP-Collection anlegen',
  body: z.object({
    collection_key: z.string(),
    name: z.string(),
    description: z.string().optional(),
  }),
  status: 201,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PUT',
  path: '/api/sop-collections/:key/items',
  tag: 'sops',
  summary: 'Mitgliedschaft einer SOP-Collection setzen (Replace, geordnet)',
  params: z.object({
    key: z.string(),
  }),
  body: z.object({
    sopKeys: z.array(z.string()),
  }),
  res: z.record(z.string(), z.unknown()),
});
