// DD-281 (M3-S01 T04): SSTD-Sources Aggregator mit Whitelist + Cache.
//
// Liefert pro Projekt:
//   - project.sstd_content + sstd_updated_at (aus projects-Tabelle)
//   - vault[]: bis zu 50 Markdown-Files unter projects.docs_path (Tiefe ≤ 3),
//              sortiert nach mtime desc; jedes Item mit obsidian://-URI.
//
// Security (R-M3-04 Mitigation):
//   - Whitelist: docs_path muss path.resolve unter einer Allow-Root liegen.
//                Allow-Roots: $HOME, projekt.repo_path, projekt.docs_path-Eltern.
//   - Glob-Tiefe max 3 (configurable, default 3).
//   - max 50 Files.
//   - Cache pro project_id, TTL 10 Minuten, in-memory.
//
// Pure-Funktion ohne Express-Abhängigkeit. fs/path injizierbar für Tests.

import { readdirSync as defaultReaddirSync, statSync as defaultStatSync } from 'fs'
import { join, resolve as pathResolve, relative as pathRelative, isAbsolute, basename } from 'path'
import { homedir } from 'os'

export const CACHE_TTL_MS = 10 * 60 * 1000
export const MAX_FILES = 50
export const MAX_DEPTH = 3

export class SstdSourcesError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

const _cache = new Map() // projectId → { ts, payload }
let _readSpy = null // optional injectable counter for tests

export function clearCache(projectId) {
  if (projectId == null) _cache.clear()
  else _cache.delete(Number(projectId))
}

export function _setReadSpy(fn) { _readSpy = fn }

function allowRoots(project) {
  const roots = [homedir()]
  if (project.repo_path) roots.push(pathResolve(project.repo_path))
  return roots.map(r => r.replace(/\/$/, ''))
}

function assertWithinWhitelist(target, project) {
  if (!target) throw new SstdSourcesError('docs_path leer', { code: 'PATH_REQUIRED', field: 'docs_path' })
  const resolved = pathResolve(target)
  const roots = allowRoots(project)
  const ok = roots.some(r => resolved === r || resolved.startsWith(r + '/'))
  if (!ok) {
    throw new SstdSourcesError(
      'docs_path liegt außerhalb der erlaubten Whitelist',
      { code: 'PATH_OUTSIDE_WHITELIST', field: 'docs_path' }
    )
  }
  return resolved
}

function obsidianUriFor(absPath) {
  const fileName = basename(absPath, '.md')
  return `obsidian://open?vault=Vault&file=${encodeURIComponent(fileName)}`
}

function globMarkdownFiles(root, { maxFiles = MAX_FILES, maxDepth = MAX_DEPTH, readdirSync = defaultReaddirSync, statSync = defaultStatSync } = {}) {
  if (_readSpy) _readSpy()
  const out = []
  function walk(dir, depth) {
    if (depth > maxDepth) return
    if (out.length >= maxFiles) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      if (out.length >= maxFiles) return
      const full = join(dir, ent.name)
      if (ent.isDirectory()) {
        if (ent.name.startsWith('.') || ent.name === 'node_modules') continue
        walk(full, depth + 1)
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        let st
        try { st = statSync(full) } catch { continue }
        out.push({ path: full, mtime: st.mtimeMs })
      }
    }
  }
  walk(root, 0)
  return out
}

/**
 * Liest project + listet vault-Markdown-Files innerhalb der Whitelist.
 * Cached pro project_id für CACHE_TTL_MS.
 */
export function getSstdSources(db, projectId, opts = {}) {
  const cached = _cache.get(Number(projectId))
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.payload
  }

  const project = db.prepare(
    'SELECT id, slug, name, sstd_content, sstd_updated_at, docs_path, repo_path FROM projects WHERE id = ?'
  ).get(projectId)
  if (!project) throw new SstdSourcesError('Projekt existiert nicht', { statusCode: 404, code: 'PROJECT_NOT_FOUND' })

  // Falls docs_path nicht gesetzt: leeres vault[] zurück, kein Whitelist-Check.
  let vaultFiles = []
  if (project.docs_path && String(project.docs_path).trim() !== '') {
    const resolved = assertWithinWhitelist(project.docs_path, project)
    const files = globMarkdownFiles(resolved, opts)
    files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0))
    vaultFiles = files.slice(0, MAX_FILES).map(f => ({
      path: f.path,
      relpath: pathRelative(resolved, f.path),
      mtime: new Date(f.mtime).toISOString(),
      obsidian_uri: obsidianUriFor(f.path),
    }))
  }

  const payload = {
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      sstd_content: project.sstd_content || null,
      sstd_updated_at: project.sstd_updated_at || null,
    },
    vault: vaultFiles,
  }
  _cache.set(Number(projectId), { ts: Date.now(), payload })
  return payload
}
