import { z } from 'zod';
import { register } from '../registry.js';
import {
  memoryLogContract,
  memoryUpdateContract,
  memorySupersedeContract,
} from '../../contracts/project-memory.contracts.js';

// ============================================================
// Global Memory (sqlite-vec / Ollama-backed, ältere API)
// ============================================================

register({
  method: 'GET',
  path: '/api/memories',
  tag: 'memory',
  summary: 'Memories auflisten (Filter + Pagination)',
  query: z.object({
    q: z.string().optional(),
    domain: z.string().optional(),
    area: z.string().optional(),
    wichtigkeit: z.string().optional(),
    schlagwort: z.string().optional(),
    page: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/memories/:id',
  tag: 'memory',
  summary: 'Einzelnes Memory abrufen',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/memories',
  tag: 'memory',
  summary: 'Memory anlegen',
  body: z.object({
    text: z.string(),
    domain: z.enum(['Privat', 'Beruf', 'Wissen']),
    area: z.string(),
    wichtigkeit: z.string().optional(),
    schlagwoerter: z.array(z.string()).optional(),
  }),
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'PUT',
  path: '/api/memories/:id',
  tag: 'memory',
  summary: 'Memory bearbeiten',
  params: z.object({ id: z.string() }),
  body: z.object({
    text: z.string().optional(),
    domain: z.enum(['Privat', 'Beruf', 'Wissen']).optional(),
    area: z.string().optional(),
    wichtigkeit: z.string().optional(),
    schlagwoerter: z.array(z.string()).optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/memories/:id',
  tag: 'memory',
  summary: 'Memory löschen',
  params: z.object({ id: z.string() }),
  res: z.null(),
  status: 204,
});

// ============================================================
// Project Memories (per-Projekt, Zod-Contracts)
// ============================================================

register({
  method: 'GET',
  path: '/api/project-memories',
  tag: 'memory',
  summary: 'Projekt-Memories auflisten',
  query: z.object({
    category: z.string().optional(),
    fields: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'GET',
  path: '/api/project-memories/search',
  tag: 'memory',
  summary: 'Projekt-Memories durchsuchen',
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    limit: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'POST',
  path: '/api/project-memories',
  tag: 'memory',
  summary: 'Projekt-Memory anlegen',
  body: memoryLogContract,
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'GET',
  path: '/api/project-memories/snapshot',
  tag: 'memory',
  summary: 'Projekt-Memory-Snapshot rendern',
  query: z.object({
    split: z.string().optional(),
    stability: z.string().optional(),
    category: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/project-memories/anchor/:anchor',
  tag: 'memory',
  summary: 'Projekt-Memory per Anchor abrufen',
  params: z.object({ anchor: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PATCH',
  path: '/api/project-memories/anchor/:anchor',
  tag: 'memory',
  summary: 'Projekt-Memory per Anchor patchen',
  params: z.object({ anchor: z.string() }),
  body: memoryUpdateContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'GET',
  path: '/api/project-memories/:id',
  tag: 'memory',
  summary: 'Projekt-Memory abrufen',
  params: z.object({ id: z.string() }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'PATCH',
  path: '/api/project-memories/:id',
  tag: 'memory',
  summary: 'Projekt-Memory aktualisieren',
  params: z.object({ id: z.string() }),
  body: memoryUpdateContract,
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/project-memories/:id',
  tag: 'memory',
  summary: 'Projekt-Memory löschen',
  params: z.object({ id: z.string() }),
  res: z.null(),
  status: 204,
});

register({
  method: 'POST',
  path: '/api/project-memories/:id/supersede',
  tag: 'memory',
  summary: 'Projekt-Memory ersetzen (append-only Korrektur)',
  params: z.object({ id: z.string() }),
  body: memorySupersedeContract,
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

// ============================================================
// Project Memory Tags (Controlled Vocabulary)
// ============================================================

register({
  method: 'GET',
  path: '/api/project-memory-tags',
  tag: 'memory',
  summary: 'Memory-Tags auflisten',
  query: z.object({
    query: z.string().optional(),
  }),
  res: z.array(z.record(z.string(), z.unknown())),
});

register({
  method: 'POST',
  path: '/api/project-memory-tags',
  tag: 'memory',
  summary: 'Memory-Tag anlegen',
  body: z.object({
    tag: z.string(),
    description: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
  status: 201,
});

register({
  method: 'POST',
  path: '/api/project-memory-tags/rename',
  tag: 'memory',
  summary: 'Memory-Tag umbenennen',
  body: z.object({
    old: z.string().optional(),
    from: z.string().optional(),
    new: z.string().optional(),
    to: z.string().optional(),
  }),
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'POST',
  path: '/api/project-memory-tags/prune',
  tag: 'memory',
  summary: 'Nicht-registrierte Memory-Tags bereinigen',
  res: z.record(z.string(), z.unknown()),
});

register({
  method: 'DELETE',
  path: '/api/project-memory-tags/:tag',
  tag: 'memory',
  summary: 'Memory-Tag löschen',
  params: z.object({ tag: z.string() }),
  res: z.record(z.string(), z.unknown()),
});
