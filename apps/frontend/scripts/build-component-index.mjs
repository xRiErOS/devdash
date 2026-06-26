#!/usr/bin/env node
/**
 * Build SQLite component registry from storybook-static/index.json + co-located MDX.
 * Run: npm run index:components
 * Output: storybook-index.db (AI-queryable, never hand-edit)
 *
 * Schema:
 *   components(import_path, title, component, tier, status, tags, variants, description, updated_at)
 *   components_fts — FTS5 index over component + tier + description + variants
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = join(ROOT, 'storybook-static', 'index.json');
const DB_PATH = join(ROOT, 'storybook-index.db');

if (!existsSync(INDEX_PATH)) {
  console.error(`storybook-static/index.json not found — run "npm run build-storybook" first`);
  process.exit(1);
}

// ── 1. Parse index.json ──────────────────────────────────────────────────────

const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
const entries = Object.values(raw.entries ?? raw);

const byFile = new Map();
for (const entry of entries) {
  if (entry.type !== 'story' && entry.type !== 'docs') continue;
  const key = entry.importPath;
  if (!byFile.has(key)) byFile.set(key, { entry, variants: [] });
  if (entry.type === 'story') byFile.get(key).variants.push(entry.name);
}

// ── 2. Scan MDX for descriptions ─────────────────────────────────────────────

function walkMdx(dir, results = []) {
  try {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) walkMdx(full, results);
      else if (f.endsWith('.mdx')) results.push(full);
    }
  } catch { /* skip unreadable */ }
  return results;
}

function extractDescription(mdxContent) {
  for (const line of mdxContent.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#') || t.startsWith('<') || t.startsWith('import ') ||
        t.startsWith('export ') || t.startsWith('{') || t.startsWith('---') ||
        t.startsWith('`status:') || t.startsWith('|') || t.startsWith('*')) continue;
    // Must be at least a minimal sentence (>20 chars, not just code/metadata)
    if (t.length < 20 || t.startsWith('`') || t.startsWith('_')) continue;
    return t;
  }
  return null;
}

const mdxDesc = new Map(); // importPath → first prose line
for (const mdxPath of walkMdx(join(ROOT, 'src'))) {
  const content = readFileSync(mdxPath, 'utf8');
  const desc = extractDescription(content);
  if (!desc) continue;
  // Map MDX → sibling stories file (same dir, replace extension pattern)
  const rel = './' + mdxPath.replace(ROOT + '/', '').replace(/\.mdx$/, '');
  for (const key of byFile.keys()) {
    if (key.startsWith(rel.replace(/\.[^.]+$/, ''))) {
      mdxDesc.set(key, desc);
      break;
    }
  }
}

// ── 3. Derive tier from importPath ───────────────────────────────────────────

function extractTier(importPath, title) {
  // Prefer title hierarchy: "01 FOUNDATIONS/..." → "foundations"
  if (title) {
    const first = title.split('/')[0].trim().toLowerCase();
    // Strip leading numeric prefix like "01 "
    const cleaned = first.replace(/^\d+\s+/, '');
    if (cleaned) return cleaned;
  }
  // Fallback: path segment after src/ui/ or src/storybook/
  const m = importPath.match(/\/src\/(?:ui\/|storybook\/)?([^/]+)\//);
  if (!m) return 'unknown';
  return m[1].toLowerCase().replace(/^\d+-/, '');
}

// ── 4. Build SQLite ──────────────────────────────────────────────────────────

const db = new Database(DB_PATH);

db.exec(`
  DROP TABLE IF EXISTS components_fts;
  DROP TABLE IF EXISTS components;

  CREATE TABLE components (
    import_path  TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    component    TEXT NOT NULL,
    tier         TEXT NOT NULL,
    status       TEXT,
    tags         TEXT,
    variants     TEXT,
    description  TEXT,
    updated_at   TEXT NOT NULL
  );

  CREATE VIRTUAL TABLE components_fts USING fts5(
    component,
    tier,
    description,
    variants,
    content='components',
    content_rowid='rowid'
  );
`);

const insert = db.prepare(`
  INSERT INTO components
    (import_path, title, component, tier, status, tags, variants, description, updated_at)
  VALUES
    (@import_path, @title, @component, @tier, @status, @tags, @variants, @description, @updated_at)
`);

const insertFts = db.prepare(`
  INSERT INTO components_fts (rowid, component, tier, description, variants)
  VALUES (last_insert_rowid(), @component, @tier, @description, @variants)
`);

const timestamp = new Date().toISOString();

const insertAll = db.transaction(() => {
  for (const [importPath, { entry, variants }] of byFile) {
    const titleParts = entry.title.split('/');
    const component = titleParts.at(-1).trim();
    const tier = extractTier(importPath, entry.title);
    const tags = entry.tags ?? [];
    const status = tags.find(t => t.startsWith('status:'))?.replace('status:', '') ?? null;
    const otherTags = tags.filter(t => !['dev', 'test', 'autodocs', 'manifest', 'attached-mdx'].includes(t) && !t.startsWith('status:'));
    const variantList = [...new Set(variants)];
    const description = mdxDesc.get(importPath) ?? null;

    const row = {
      import_path: importPath,
      title: entry.title,
      component,
      tier,
      status,
      tags: otherTags.length ? JSON.stringify(otherTags) : null,
      variants: JSON.stringify(variantList),
      description,
      updated_at: timestamp,
    };

    insert.run(row);
    insertFts.run({ component, tier, description: description ?? '', variants: variantList.join(' ') });
  }
});

insertAll();
db.close();

console.log(`✓ ${byFile.size} components → ${DB_PATH}`);
console.log(`  Query example: SELECT component, tier, status, description FROM components WHERE tier = 'atoms';`);
console.log(`  FTS  example: SELECT c.* FROM components_fts f JOIN components c ON c.rowid = f.rowid WHERE components_fts MATCH 'button input';`);
