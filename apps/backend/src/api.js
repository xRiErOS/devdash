import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import multer from 'multer'
import { fileTypeFromFile } from 'file-type'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, unlinkSync, renameSync, copyFileSync } from 'fs'
import { body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'crypto'
import { canTransition, canSprintTransition, canAssignSprint } from './lib/lifecycle.js'
import { TAG_COLORS as TAG_COLORS_CONTRACT } from '@devd/api-types/tag.contracts.js'
import {
  closeMilestoneWithIssues,
  listOpenIssuesForMilestone,
  MilestoneCloseError,
} from './lib/milestoneClose.js'
import { listMemories, getMemory, insertMemory, updateMemory, deleteMemory } from './lib/memoryDb.js'
import { validateMilestonePayload, validateStatusFilter, sendValidationError, resolveTargetDate } from './lib/milestoneValidation.js'
import { insertDependency, getDependenciesForMilestone } from './lib/milestoneDependencies.js'
import { insertDependency as insertSprintDependency, getDependenciesForSprint } from './lib/sprintDependencies.js'
import { computeSprintCompleteness } from './lib/sprintCompleteness.js'
import { buildSprintContextMarkdown } from './lib/sprintContext.js'
import { serializeBacklog } from './lib/backlogExport.js'
import { insertDodItem, patchDodItem, deleteDodItem, listDodItems, reorderDodItems } from './lib/milestoneDodItems.js'
import { patchMilestoneStatus, cascadeCompleteMilestone } from './lib/milestoneLifecycle.js'
import { getProjectWithCounts, listProjectsWithCounts } from './lib/projectCounts.js'
import { priorityFilter } from './lib/backlogFilters.js'
import {
  listTodos,
  insertTodo,
  patchTodo,
  deleteTodo,
  reorderTodos,
  ProjectTodoError,
} from './lib/projectTodos.js'
import {
  addTodoLink,
  removeTodoLink,
  TodoLinkError,
} from './lib/projectTodoLinks.js'
import { validateSpecPath, MilestoneSpecPathError } from './lib/milestoneSpecPath.js'
import { listMemories as listProjectMemories, getMemory as getProjectMemory, createMemory as createProjectMemory, updateMemory as updateProjectMemory, deleteMemory as deleteProjectMemory, supersedeMemory as supersedeProjectMemory, searchMemories as searchProjectMemories, getMemoryByAnchor as getProjectMemoryByAnchor, patchByAnchor as patchProjectMemoryByAnchor, ProjectMemoryError } from './lib/projectMemories.js'
import { renderSnapshot as renderProjectMemorySnapshot, renderSplitSnapshot as renderProjectMemorySplitSnapshot } from './lib/projectMemorySnapshot.js'
import { cascadeDeleteSprints, milestoneDeletePreview, sprintDocumentCount } from './lib/cascadeDelete.js'
import {
  DocumentError,
  createDocument, listDocuments, listAllDocuments, getDocument, updateDocument, deleteDocument,
} from './lib/documents.js'
import { listTags as listMemoryTags, createTag as createMemoryTag, renameTag as renameMemoryTag, deleteTag as deleteMemoryTag, pruneTagsNotInRegistry as pruneMemoryTags } from './lib/memoryTags.js'
import { listIssueDependencies, countIssueDependencies } from './lib/issueDependencies.js'
import { resolveIssueByNumber } from './lib/issueResolve.js'
import { shouldBlockOnCaptureHost, hostIsCaptureHost, DEFAULT_CAPTURE_HOST } from './lib/captureHostGuard.js'
import { resolveCaptureClientIp, captureCapRejection, PUBLIC_CAPTURE_MAX_FILE_BYTES } from './lib/captureAbuseGuard.js'
import { createApiKeyAuth } from './middleware/apiKeyAuth.js'
import { createDevdTokenAuth } from './middleware/devdToken.js'
import { isTrustedSource } from './lib/trustedSource.js'
import { applyBacklogUpdate, BacklogUpdateError } from './lib/backlogUpdate.js'
// DD-560: backlog/issue-Payloads via geteiltem Zod-Contract (Single Source, CONTRACT-GATEWAY-PATTERN #303).
import { issueCreateContract } from '@devd/api-types/backlog.contracts.js'
// DD-561: sprint-Payloads via geteiltem Zod-Contract (Single Source mit CLI + MCP).
import { sprintCreateContract } from '@devd/api-types/milestone-sprint.contracts.js'
import { coerceSprintPosition } from './lib/sprintFieldGuards.js'
import { submitSprintReview, assertReviewEditable, maybeAutoOpenReworkRound, reopenReviewRound, ReviewEditLockedError, autoSetPassedOnReviewPass, autoSetRejectedOnReviewFail, canReopenReview, REOPENABLE_STATUSES } from './lib/reviewMarker.js'
import {
  SubtaskValidationError,
  listSubtasks,
  createSubtask,
  updateSubtask,
  setSubtaskStatus,
  deleteSubtask,
  reorderSubtasks,
} from './lib/subtasks.js'
import {
  UserStoryValidationError,
  listUserStories,
  createUserStory,
  updateUserStory,
  setUserStoryVerdict,
  deleteUserStory,
} from './lib/userStories.js'
import {
  UserNoteError,
  createUserNote, listUserNotes, getUserNote, updateUserNote, deleteUserNote,
} from './lib/userNotes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Pfad zur Projekt-DB. Wird per Default aus dem benachbarten myPrivateBabyTracker-Repo
// gelesen; via DEVD_DB_PATH frei konfigurierbar (z.B. für andere Projekte).
const DB_PATH =
  process.env.DEVD_DB_PATH ||
  resolve(__dirname, '../data/devd.db')
const UPLOADS_DIR = resolve(__dirname, '../uploads')

// Memory-System Konfiguration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'bge-m3'

async function getEmbedding(text) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, input: text }),
    })
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
    const data = await res.json()
    const floats = new Float32Array(data.embeddings[0])
    return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength)
  } catch (e) {
    console.warn('[memory] Ollama embed fehlgeschlagen:', e.message)
    return null
  }
}

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// DD-251: API-Key-Auth middleware (X-API-Key → req.user, no-op when header absent)
const apiKeyAuth = createApiKeyAuth(db)

// Ensure review tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS review_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backlog_id INTEGER NOT NULL REFERENCES backlog(id),
    status TEXT NOT NULL DEFAULT 'pending',
    comment TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS review_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL REFERENCES review_feedback(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

// Trust loopback + private network ranges so req.ip reflects the real client
// behind NPM. NEVER use pauschal `true` — that lets clients spoof X-Forwarded-*.
app.set('trust proxy', ['loopback', 'uniquelocal'])

// ============================================================
// DD-375: Capture-Host API-Allowlist — see server/lib/captureHostGuard.js for
// the rationale + the allowlisted endpoints. Pure logic is unit-tested there.
// ============================================================
const CAPTURE_HOST = (process.env.CAPTURE_HOST || DEFAULT_CAPTURE_HOST).toLowerCase()
app.use((req, res, next) => {
  if (shouldBlockOnCaptureHost({
    host: req.hostname || req.headers.host,
    method: req.method,
    path: req.path,
    captureHost: CAPTURE_HOST,
  })) {
    return res.status(403).json({
      error: 'FORBIDDEN_ON_CAPTURE_HOST',
      detail: 'Only the issue-capture endpoints are exposed on this host.',
    })
  }
  next()
})

// ============================================================
// Authelia Forward-Auth Middleware (DD-221)
// NPM extracts Remote-* response headers from Authelia and forwards them as
// request headers. We read them case-insensitively (Express lowercases all
// req.headers keys). Defense-in-Depth: if req.ip is not a trusted private
// address, we discard incoming Remote-* headers — they would only legitimately
// arrive from our own NPM container in the docker proxy_network.
//
// Dev bypass: when AUTHELIA_DEV_BYPASS=1 is set, populate req.user from
// DEV_USER (default "erik") so local development without Authelia works.
// ============================================================
const AUTHELIA_DEV_BYPASS = process.env.AUTHELIA_DEV_BYPASS === '1' || process.env.AUTHELIA_DEV_BYPASS === 'true'
const DEV_USER = process.env.DEV_USER || 'erik'

if (AUTHELIA_DEV_BYPASS) {
  console.warn(`⚠️  AUTHELIA_DEV_BYPASS enabled — every request gets req.user={username:"${DEV_USER}"}. NEVER set this in production.`)
}

function isTrustedProxySource(req) {
  // Delegiert an server/lib/trustedSource.js (DD-297).
  return isTrustedSource(req.ip || '')
}

app.use((req, _res, next) => {
  if (AUTHELIA_DEV_BYPASS) {
    req.user = { username: DEV_USER, groups: [], email: null, name: DEV_USER }
    return next()
  }
  if (!isTrustedProxySource(req)) {
    if (req.headers['remote-user'] || req.headers['remote-groups'] || req.headers['remote-email'] || req.headers['remote-name']) {
      console.warn(`[auth] Untrusted source ${req.ip} sent Remote-* headers — stripped.`)
    }
    // Strip any Remote-* headers a client tried to inject directly
    delete req.headers['remote-user']
    delete req.headers['remote-groups']
    delete req.headers['remote-email']
    delete req.headers['remote-name']
    req.user = null
    return next()
  }
  const rawUsername = req.headers['remote-user']
  if (!rawUsername) {
    req.user = null
    return next()
  }
  const usernameStr = String(rawUsername)
  if (/[\r\n\0]/.test(usernameStr)) {
    // Header looks tampered (CRLF / NUL injection attempt). Treat as no user.
    req.user = null
    return next()
  }
  const groupsHeader = req.headers['remote-groups'] || ''
  const MAX_GROUPS = 50
  const groups = groupsHeader
    ? String(groupsHeader).slice(0, 4096).split(',').slice(0, MAX_GROUPS).map(s => s.trim()).filter(Boolean)
    : []
  req.user = {
    username: usernameStr.slice(0, 255),
    groups,
    email: req.headers['remote-email'] ? String(req.headers['remote-email']).slice(0, 255) : null,
    name: req.headers['remote-name'] ? String(req.headers['remote-name']).slice(0, 255) : null,
  }
  next()
})

// DD-285: Defense-in-Depth Token-Auth fuer mutierende /api/-Routen.
// No-Op wenn DEVD_API_TOKEN nicht gesetzt (Backwards-Compat fuer Dev).
// Bypass fuer (a) Authelia-authentifizierte Requests (req.user gesetzt) und
// (b) LAN/Tailscale-Quellen (isTrustedProxySource). Defense-in-Depth bleibt
// aktiv fuer unauthentifizierte externe Direct-API-Calls (CF-Tunnel-Umgehung,
// Cookie-Diebstahl). Browser-UI im LAN und MCP/CLI ueber Tailscale gehen
// durch, ohne dass der Browser-Client den Header explizit setzen muesste.
app.use(createDevdTokenAuth({
  bypassIf: (req) => {
    if (req.user) return true
    if (isTrustedProxySource(req)) return true
    // DD-297: Same-Origin-Bypass. Browser-UI sendet bei XHR-Writes IMMER
    // einen Origin-Header (Fetch-Spec). Ist Origin == eigener Host, ist es
    // ein UI-Call vom selben Deploy — kein CF-Tunnel-Bypass. CORS verhindert,
    // dass ein Browser von fremder Page aus Origin spoofen kann. Token-Schutz
    // gegen non-browser direct-API-Calls bleibt aktiv (kein Origin).
    const origin = req.headers.origin
    const host = req.headers.host
    if (origin && host) {
      try {
        const originHost = new URL(origin).host
        if (originHost === host) return true
      } catch { /* malformed origin → no bypass */ }
    }
    return false
  },
}))

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// ============================================================
// DD-224: Dedicated Multer config for PWA image-capture uploads.
// Separate from the legacy `upload` (line 172) so we can lock down
// MIME types + size limits without breaking the existing attachments
// endpoint. DD-222 mounts this on POST /api/issues.
// ============================================================
const PWA_ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])
const PWA_MAX_FILE_BYTES = 8 * 1024 * 1024 // 8 MB
const PWA_TMP_DIR = path.join(os.tmpdir(), 'devd-pwa-upload')
if (!existsSync(PWA_TMP_DIR)) mkdirSync(PWA_TMP_DIR, { recursive: true })

const pwaUpload = multer({
  storage: multer.diskStorage({
    destination: PWA_TMP_DIR,
    // randomUUID + safe extension lookup — never trust file.originalname (path traversal).
    filename: (_req, file, cb) => {
      const extByMime = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }
      const ext = extByMime[file.mimetype] || '.bin'
      cb(null, `${randomUUID()}${ext}`)
    },
  }),
  limits: {
    fileSize: PWA_MAX_FILE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!PWA_ALLOWED_MIME.has(file.mimetype)) {
      // Multer recognises this as a generic error → handler maps to 415.
      const err = new Error('UNSUPPORTED_MEDIA_TYPE')
      err.code = 'UNSUPPORTED_MEDIA_TYPE'
      return cb(err)
    }
    cb(null, true)
  },
})

// Verifies the uploaded file's MAGIC BYTES match the declared MIME type.
// MIME header is client-controlled — magic-byte check defends against
// polyglot files (e.g. valid GIF + embedded JS) and renamed payloads.
// Returns { ok: true, mime } | { ok: false, reason }.
async function verifyImageMagicBytes(filePath, declaredMime) {
  try {
    const detected = await fileTypeFromFile(filePath)
    if (!detected) return { ok: false, reason: 'NO_MAGIC_BYTES' }
    if (!PWA_ALLOWED_MIME.has(detected.mime)) return { ok: false, reason: 'MAGIC_MIME_NOT_ALLOWED', mime: detected.mime }
    if (detected.mime !== declaredMime) return { ok: false, reason: 'MAGIC_MIME_MISMATCH', mime: detected.mime }
    return { ok: true, mime: detected.mime }
  } catch (e) {
    return { ok: false, reason: 'MAGIC_BYTE_READ_ERROR' }
  }
}

// Multer-error → HTTP-status mapper for PWA uploads.
// Use as: app.post(..., (err, req, res, next) => pwaMulterErrorHandler(err, res, next))
function pwaMulterErrorHandler(err, res, next) {
  if (!err) return next()
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE', max_bytes: PWA_MAX_FILE_BYTES })
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'TOO_MANY_FILES' })
    return res.status(400).json({ error: 'UPLOAD_ERROR', code: err.code })
  }
  if (err && err.code === 'UNSUPPORTED_MEDIA_TYPE') {
    return res.status(415).json({ error: 'UNSUPPORTED_MEDIA_TYPE', allowed: Array.from(PWA_ALLOWED_MIME) })
  }
  return next(err)
}

// DD-222: rate-limit per IP for the public capture endpoint. In-memory store
// is fine for single-process — when we scale we'll switch to Redis.
const issuesCaptureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,                  // 20 POSTs per client per window
  standardHeaders: true,
  legacyHeaders: false,
  // DD-393: key on the real client. Behind Cloudflare, req.ip is the CF edge ip
  // (CF is public → not a trusted proxy), so the default would bucket all public
  // traffic together. CF-Connecting-IP carries the real client; fall back to req.ip
  // for non-CF (direct Tailscale/LAN) requests.
  keyGenerator: (req) => resolveCaptureClientIp({
    cfConnectingIp: req.headers['cf-connecting-ip'],
    fallbackIp: req.ip,
  }),
  message: { error: 'RATE_LIMIT_EXCEEDED', retry_after_seconds: 15 * 60 },
})

// GET /api/config — Frontend-Feature-Flags (aktuell keine; Archon entfernt DD2-172)
app.get('/api/config', (_req, res) => {
  res.json({})
})

// DD-230: liveness probe — no DB, no auth, no side-effects. Container HEALTHCHECK
// targets this. Separate from /ready which actually opens the DB.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// DD-230: readiness probe — touches the DB with a trivial query. Used to gate
// traffic in orchestrators that distinguish liveness from readiness.
app.get('/ready', (_req, res) => {
  try {
    db.prepare('SELECT 1').get()
    res.json({ status: 'ready' })
  } catch (err) {
    res.status(503).json({ status: 'not_ready', error: err.message })
  }
})

// --- Tags (DD-29) ---
// DD-53: Tag-Farben auf 6 Werte beschraenkt (1 Primary + 4 semantische + neutral).
// DD-624: Single Source ist jetzt contracts/tag.contracts.js (TAG_COLORS importiert,
// nicht mehr inline) — CLI/MCP-Client-Guards leiten aus demselben Contract ab.
const TAG_COLORS = TAG_COLORS_CONTRACT

function tagsForBacklog(ids) {
  // ids: array of backlog ids; returns map id → [{id,name,color}]
  if (!ids.length) return new Map()
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT bt.backlog_id, t.id, t.name, t.color
    FROM backlog_tags bt
    JOIN tags t ON t.id = bt.tag_id
    WHERE bt.backlog_id IN (${placeholders})
    ORDER BY t.name
  `).all(...ids)
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.backlog_id)) map.set(r.backlog_id, [])
    map.get(r.backlog_id).push({ id: r.id, name: r.name, color: r.color })
  }
  return map
}

// GF-2 Wave D / D1: Tags eines Sprints/Milestones (mirror tagsForBacklog) — additive
// Junctions sprint_tags/milestone_tags. Liefert sortierte [{id,name,color}].
function tagsForSprint(sprintId) {
  return db.prepare(`
    SELECT t.id, t.name, t.color FROM sprint_tags st
    JOIN tags t ON t.id = st.tag_id WHERE st.sprint_id = ? ORDER BY t.name
  `).all(sprintId)
}

function tagsForMilestone(milestoneId) {
  return db.prepare(`
    SELECT t.id, t.name, t.color FROM milestone_tags mt
    JOIN tags t ON t.id = mt.tag_id WHERE mt.milestone_id = ? ORDER BY t.name
  `).all(milestoneId)
}

// DD2-143: Batch-Variante (mirror tagsForBacklog) — Tags vieler Milestones in
// einem Query, map milestone_id → [{id,name,color}]. Vermeidet N+1 beim Embedden
// der Tags in die GET /api/milestones Liste (TUI msRows / RoadmapBoard).
function tagsForMilestones(ids) {
  if (!ids.length) return new Map()
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT mt.milestone_id, t.id, t.name, t.color
    FROM milestone_tags mt
    JOIN tags t ON t.id = mt.tag_id
    WHERE mt.milestone_id IN (${placeholders})
    ORDER BY t.name
  `).all(...ids)
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.milestone_id)) map.set(r.milestone_id, [])
    map.get(r.milestone_id).push({ id: r.id, name: r.name, color: r.color })
  }
  return map
}

// GF-2 Wave D / D1: generischer Replace-Handler für Entity-Tags (mirror PUT /api/backlog/:id/tags).
// table = sprint_tags|milestone_tags, fkCol = sprint_id|milestone_id, parentTable = sprints|milestones.
function replaceEntityTags(req, res, { parentTable, table, fkCol, read }) {
  const item = db.prepare(`SELECT id, project_id FROM ${parentTable} WHERE id = ?`).get(req.params.id)
  if (!item) return res.status(404).json({ error: `${parentTable} nicht gefunden` })
  const tagIds = Array.isArray(req.body?.tag_ids) ? req.body.tag_ids.map(Number).filter(n => Number.isFinite(n)) : []
  if (tagIds.length) {
    const placeholders = tagIds.map(() => '?').join(',')
    const owned = db.prepare(`SELECT id FROM tags WHERE id IN (${placeholders}) AND project_id = ?`).all(...tagIds, item.project_id)
    if (owned.length !== tagIds.length) {
      return res.status(422).json({ error: 'Mindestens ein Tag gehoert nicht zum Projekt' })
    }
  }
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM ${table} WHERE ${fkCol} = ?`).run(req.params.id)
    const ins = db.prepare(`INSERT OR IGNORE INTO ${table} (${fkCol}, tag_id) VALUES (?, ?)`)
    for (const tid of tagIds) ins.run(req.params.id, tid)
  })
  tx()
  res.json({ tags: read(Number(req.params.id)) })
}

// GF-2 Wave D / D1: Sprint-Tags (replace + read).
app.put('/api/sprints/:id/tags', (req, res) =>
  replaceEntityTags(req, res, { parentTable: 'sprints', table: 'sprint_tags', fkCol: 'sprint_id', read: tagsForSprint }))
app.get('/api/sprints/:id/tags', (req, res) => {
  const item = db.prepare('SELECT id FROM sprints WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'sprints nicht gefunden' })
  res.json({ tags: tagsForSprint(Number(req.params.id)) })
})

// GF-2 Wave D / D1: Milestone-Tags (replace + read).
app.put('/api/milestones/:id/tags', (req, res) =>
  replaceEntityTags(req, res, { parentTable: 'milestones', table: 'milestone_tags', fkCol: 'milestone_id', read: tagsForMilestone }))
app.get('/api/milestones/:id/tags', (req, res) => {
  const item = db.prepare('SELECT id FROM milestones WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'milestones nicht gefunden' })
  res.json({ tags: tagsForMilestone(Number(req.params.id)) })
})

// GET /api/tags — Tags des aktiven Projekts mit Usage-Count.
app.get('/api/tags', (req, res) => {
  const projectId = currentProjectId(req)
  const rows = db.prepare(`
    SELECT t.id, t.name, t.color, t.created_at,
      (SELECT COUNT(*) FROM backlog_tags bt WHERE bt.tag_id = t.id) AS usage_count
    FROM tags t
    WHERE t.project_id = ?
    ORDER BY t.name
  `).all(projectId)
  res.json(rows)
})

// POST /api/tags — Neuen Tag im aktiven Projekt anlegen.
app.post('/api/tags', (req, res) => {
  const projectId = currentProjectId(req)
  const name = String(req.body?.name || '').trim()
  const color = String(req.body?.color || 'mauve').trim()
  if (!name) return res.status(400).json({ error: 'name ist Pflichtfeld' })
  if (!TAG_COLORS.includes(color)) return res.status(400).json({ error: `color muss einer von ${TAG_COLORS.join(',')} sein` })
  try {
    const r = db.prepare('INSERT INTO tags (project_id, name, color) VALUES (?, ?, ?)').run(projectId, name, color)
    const tag = db.prepare('SELECT id, name, color, created_at FROM tags WHERE id = ?').get(r.lastInsertRowid)
    auditLog('tags', tag.id, 'create', null, tag, 'dashboard-po')
    res.status(201).json({ ...tag, usage_count: 0 })
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Tag-Name existiert bereits in diesem Projekt' })
    throw e
  }
})

// PUT /api/tags/:id — Tag umbenennen / Farbe aendern.
app.put('/api/tags/:id', (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id)
  if (!tag) return res.status(404).json({ error: 'Tag nicht gefunden' })
  const name = req.body?.name === undefined ? tag.name : String(req.body.name).trim()
  const color = req.body?.color === undefined ? tag.color : String(req.body.color).trim()
  if (!name) return res.status(400).json({ error: 'name darf nicht leer sein' })
  if (!TAG_COLORS.includes(color)) return res.status(400).json({ error: `color muss einer von ${TAG_COLORS.join(',')} sein` })
  try {
    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, req.params.id)
    const updated = db.prepare('SELECT id, name, color, created_at FROM tags WHERE id = ?').get(req.params.id)
    auditLog('tags', tag.id, 'update', { name: tag.name, color: tag.color }, updated, 'dashboard-po')
    const usage = db.prepare('SELECT COUNT(*) AS n FROM backlog_tags WHERE tag_id = ?').get(req.params.id).n
    res.json({ ...updated, usage_count: usage })
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Tag-Name existiert bereits' })
    throw e
  }
})

// DELETE /api/tags/:id — Tag löschen (cascading entfernt backlog_tags).
app.delete('/api/tags/:id', (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id)
  if (!tag) return res.status(404).json({ error: 'Tag nicht gefunden' })
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id)
  auditLog('tags', tag.id, 'delete', tag, null, 'dashboard-po')
  res.json({ ok: true })
})

// PUT /api/backlog/:id/tags — Vollständige Zuweisung (replace).
app.put('/api/backlog/:id/tags', (req, res) => {
  const item = db.prepare('SELECT id, project_id FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item nicht gefunden' })
  const tagIds = Array.isArray(req.body?.tag_ids) ? req.body.tag_ids.map(Number).filter(n => Number.isFinite(n)) : []
  // validate ownership: alle tag_ids müssen zum gleichen project gehoeren
  if (tagIds.length) {
    const placeholders = tagIds.map(() => '?').join(',')
    const owned = db.prepare(`SELECT id FROM tags WHERE id IN (${placeholders}) AND project_id = ?`).all(...tagIds, item.project_id)
    if (owned.length !== tagIds.length) {
      return res.status(422).json({ error: 'Mindestens ein Tag gehoert nicht zum Projekt' })
    }
  }
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM backlog_tags WHERE backlog_id = ?').run(req.params.id)
    const ins = db.prepare('INSERT OR IGNORE INTO backlog_tags (backlog_id, tag_id) VALUES (?, ?)')
    for (const tid of tagIds) ins.run(req.params.id, tid)
  })
  tx()
  const tags = tagsForBacklog([Number(req.params.id)]).get(Number(req.params.id)) || []
  res.json({ tags })
})

// --- Settings (DD-27) ---
// Maskiert Secrets: nur die letzten 4 Zeichen plus Sterne.
function maskValue(v) {
  if (v == null) return null
  const s = String(v)
  if (s.length <= 4) return '****'
  return '****' + s.slice(-4)
}

// GET /api/settings — alle Settings; Secrets werden maskiert ausgeliefert.
app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value, description, is_secret, updated_at FROM settings ORDER BY key').all()
  const out = rows.map(r => ({
    key: r.key,
    description: r.description,
    is_secret: !!r.is_secret,
    updated_at: r.updated_at,
    has_value: !!r.value,
    value: r.is_secret ? maskValue(r.value) : r.value,
  }))
  res.json(out)
})

// PUT /api/settings/:key — Setting setzen (oder leeren via value=null/'').
app.put('/api/settings/:key', (req, res) => {
  const { value } = req.body
  const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key)
  if (!existing) return res.status(404).json({ error: 'Unbekannter Setting-Key' })
  const newValue = (value === undefined || value === null || value === '') ? null : String(value)
  db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
    .run(newValue, req.params.key)
  auditLog('settings', 0, 'update',
    { key: req.params.key, has_value: !!existing.value },
    { key: req.params.key, has_value: !!newValue },
    'dashboard-po')
  const updated = db.prepare('SELECT key, value, description, is_secret, updated_at FROM settings WHERE key = ?').get(req.params.key)
  res.json({
    key: updated.key,
    description: updated.description,
    is_secret: !!updated.is_secret,
    updated_at: updated.updated_at,
    has_value: !!updated.value,
    value: updated.is_secret ? maskValue(updated.value) : updated.value,
  })
})

// Aktives Projekt: Header X-Project-Id > Query ?project_id= > Body.project_id > Default 1
function currentProjectId(req) {
  const raw =
    req.headers['x-project-id'] ||
    req.query?.project_id ||
    req.body?.project_id ||
    1
  const id = Number(raw)
  if (Number.isFinite(id) && id > 0) return id
  // Slug-Resolve: "devd" → project.id
  if (typeof raw === 'string' && raw.length > 0) {
    const project = db.prepare('SELECT id FROM projects WHERE slug = ?').get(raw)
    if (project) return project.id
  }
  return 1
}

// DD-390 (B02): :id-Pfad-Param kann numerische id ODER slug sein. Agenten/CLI rufen
// project-scoped Routen mit slug ("devd"); currentProjectId resolved nur den Header-/
// Query-/Body-Pfad, die :id-Pfad-Routen brauchen ihr eigenes Resolve. Numerisch unverändert,
// slug als Fallback. Gibt null, wenn weder numerische id noch slug auflösbar → Aufrufer 404.
function resolveProjectId(raw) {
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n
  if (typeof raw === 'string' && raw.length > 0) {
    const project = db.prepare('SELECT id FROM projects WHERE slug = ?').get(raw)
    if (project) return project.id
  }
  return null
}

// DD-620/DD-622: Compact-Default + limit/offset für List-Endpoints. Token-Schutz für
// MCP/CLI-Agenten — Listen liefern per Default nur Identitäts-/Status-Felder; das
// Vollobjekt via ?fields=full (oder das jeweilige *_show). Das Browser-UI hängt fields=full
// zentral im apiClient an (src/lib/apiClient.js), bleibt also unberührt. limit/offset
// paginieren clientunabhängig; X-Total-Count trägt die Gesamtzahl vor dem Slice.
// fields-Param auflösen: leer/'compact' → Compact-Set; 'full' → alle Felder;
// sonst Komma-Whitelist (z.B. ?fields=key,status,title — DD-620 Acceptance #5).
function resolveFields(req, compactKeys) {
  const f = typeof req.query.fields === 'string' ? req.query.fields.trim() : ''
  if (f === '' || f.toLowerCase() === 'compact') return { mode: 'compact', keys: compactKeys }
  if (f.toLowerCase() === 'full') return { mode: 'full', keys: null }
  const keys = f.split(',').map(s => s.trim()).filter(Boolean)
  return keys.length ? { mode: 'pick', keys } : { mode: 'compact', keys: compactKeys }
}
function projectCompact(rows, compactKeys) {
  return rows.map(r => {
    const slim = {}
    for (const k of compactKeys) if (r[k] !== undefined) slim[k] = r[k]
    return slim
  })
}
function paginate(req, res, rows) {
  const offRaw = Number.parseInt(req.query.offset, 10)
  const limRaw = Number.parseInt(req.query.limit, 10)
  const offset = Number.isFinite(offRaw) && offRaw > 0 ? offRaw : 0
  const hasLimit = Number.isFinite(limRaw) && limRaw >= 0
  if (offset > 0 || hasLimit) {
    res.set('X-Total-Count', String(rows.length))
    const end = hasLimit ? offset + limRaw : undefined
    return rows.slice(offset, end)
  }
  return rows
}
// Compact-/full-/pick-Projektion + Pagination in einem Schritt, dann senden.
function sendList(req, res, rows, compactKeys) {
  const { mode, keys } = resolveFields(req, compactKeys)
  const projected = mode === 'full' ? rows : projectCompact(rows, keys)
  res.json(paginate(req, res, projected))
}

// Identitäts-/Status-Felder für die Compact-Listen. Bewusst OHNE die SSTD-großen
// Prosa-Felder (goal/background/context_notes …),
// die den 653K/75K-Output rissen (DD-620). key-Formatter (CLI) brauchen prefix+number.
const COMPACT_BACKLOG_KEYS = [
  'id', 'key', 'project_prefix', 'project_number', 'title', 'status', 'type', 'priority',
  'assigned_sprint', 'sprint_key', 'sprint_name', 'milestone', 'review_status', 'tags',
]
const COMPACT_SPRINT_KEYS = [
  'id', 'key', 'project_prefix', 'project_number', 'name', 'status', 'goal',
  'start_date', 'end_date', 'capacity', 'wip_limit', 'position',
  'milestone_id', 'milestone_name', 'item_count', 'done_count', 'passed_count', 'terminal_count',
]
// DD-622: project-memories ohne das 64k-content-Feld (CLI memory list / MCP memory_list
// brauchen es nicht — Detail via memory show). project-memories ist eine flache Liste.
const COMPACT_MEMORY_KEYS = [
  'id', 'category', 'summary', 'anchor', 'stability', 'pinned', 'importance',
  'tags', 'source_type', 'source_ref', 'superseded_by', 'created_at', 'updated_at',
]
// DD-622: projects ohne die großen Project-Home-Prosa-Felder
// (vision/goals/summary_*). CLI/MCP project list zeigen Identität + Counts.
const COMPACT_PROJECT_KEYS = [
  'id', 'slug', 'name', 'prefix', 'color', 'archived', 'description',
  'storybook_url', 'repo_path', 'docs_path', 'public_capture', 'sprint_count', 'backlog_count',
]

// --- Projects ---
app.get('/api/projects', (req, res) => {
  // T-be3 (Backend-I05): Counts-Aggregat via Lib (milestone/memory + active_sprint additiv).
  const rows = listProjectsWithCounts(db)
  sendList(req, res, rows, COMPACT_PROJECT_KEYS)   // DD-622: Compact-Default (?fields=full opt-in)
})

// DD-223: Minimale Projektliste für PWA-Capture-Dropdown. Nur id/name/prefix/slug/color,
// keine Prosa / counts — bandbreitenschonend für Mobile.
// DD-269 R3: slug ergänzt — Deeplink-Resolver in CaptureView braucht slug-Match.
// Muss VOR /api/projects/:id stehen, sonst greift :id-Route bei "list-minimal".
app.get('/api/projects/list-minimal', apiKeyAuth, (req, res) => {
  // DD-392: on the public capture host (issues.*) return ONLY projects flagged
  // public_capture=1 — private projects must never leak to the internet. On every
  // other host (devdash.* admin behind Authelia, localhost) the full list is returned.
  const onCaptureHost = hostIsCaptureHost(req.hostname || req.headers.host, CAPTURE_HOST)
  const rows = db.prepare(`
    SELECT id, name, prefix, slug, color
    FROM projects
    WHERE archived = 0 ${onCaptureHost ? 'AND public_capture = 1' : ''}
    ORDER BY name
  `).all()
  res.json(rows)
})

// DD-392/DD-456: narrow per-slug capture-meta endpoint for the pinned-slug
// deep-link (/catch/<slug>). Host-scoped exposure mirrors list-minimal:
//   - on the public capture host (issues.*) resolve ONLY public_capture=1 projects
//     (external testers, deep-link only); anything else → 404 (no name confirmation,
//     no enumeration of private projects).
//   - on every other host (devdash.* admin behind Authelia, localhost, tailnet)
//     resolve ALL projects → Erik/Julia get full pinned capture via /catch/<slug>.
// Reachability: allowlisted on the capture host (captureHostGuard); on devdash.*
// it sits behind Authelia, so the unfiltered branch is only served to authn'd users.
app.get('/api/projects/by-slug/:slug/capture', (req, res) => {
  const onCaptureHost = hostIsCaptureHost(req.hostname || req.headers.host, CAPTURE_HOST)
  const row = db.prepare(`
    SELECT id, name, prefix, slug, color
    FROM projects
    WHERE LOWER(slug) = LOWER(?) AND archived = 0 ${onCaptureHost ? 'AND public_capture = 1' : ''}
  `).get(String(req.params.slug || ''))
  if (!row) return res.status(404).json({ error: 'NOT_PUBLIC_OR_UNKNOWN' })
  res.json(row)
})

// DD-194: Globaler Home-Dashboard. Aggregat-Endpoint liefert pro nicht-archiviertem
// Projekt eine Kachel-Zeile mit Kennzahlen (offene Sprints/Milestones/Issues).
// Single SQL mit LEFT JOIN-Subqueries — vermeidet N+1.
app.get('/api/dashboard/home', (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        p.id          AS projectId,
        p.name        AS name,
        p.color       AS color,
        p.prefix      AS prefix,
        p.slug        AS slug,
        COALESCE(s.cnt,  0) AS openSprints,
        COALESCE(m.cnt,  0) AS openMilestones,
        COALESCE(bs.cnt, 0) AS issuesInSprints,
        COALESCE(bb.cnt, 0) AS issuesInBacklog
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*) AS cnt
        FROM sprints
        WHERE status NOT IN ('completed','cancelled')
        GROUP BY project_id
      ) s  ON s.project_id  = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) AS cnt
        FROM milestones
        WHERE status IN ('new','planned','in_progress')
        GROUP BY project_id
      ) m  ON m.project_id  = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) AS cnt
        FROM backlog
        WHERE assigned_sprint IS NOT NULL
          AND status NOT IN ('completed','cancelled')
        GROUP BY project_id
      ) bs ON bs.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) AS cnt
        FROM backlog
        WHERE assigned_sprint IS NULL
          AND status NOT IN ('completed','cancelled')
        GROUP BY project_id
      ) bb ON bb.project_id = p.id
      WHERE p.archived = 0
      ORDER BY p.id
    `).all()
    res.json(rows)
  } catch (e) {
    console.error('[dashboard/home]', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/projects/:id/files — DD-130/DD-143: Repo-/Docs-Filesystem fuer Auto-Complete.
// Listet Dateien aus dem konfigurierten projects.repo_path (+ optional docs_path)
// rekursiv. Fallback: Repo-Root von DevD selbst (Dogfooding). Filter via ?q=, max 100.
import { readdirSync as _readdirSync } from 'fs'
const REPO_ROOT = resolve(__dirname, '..')
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', '.parcel-cache', 'uploads', '.vscode', '.idea'])

// Cache pro Project-ID. Invalidierung nach 30s.
const fileCacheByProject = new Map() // projectId -> { mtime, files }

function listProjectFiles(projectId) {
  const now = Date.now()
  const cached = fileCacheByProject.get(projectId)
  if (cached && now - cached.mtime < 30_000) return cached.files

  const proj = db.prepare('SELECT repo_path, docs_path FROM projects WHERE id = ?').get(projectId)
  // Pro Root-Pfad ein Tag (R: oder D:) damit das Frontend leicht filtern kann.
  const roots = []
  if (proj?.repo_path && proj.repo_path.trim()) roots.push({ tag: 'repo', root: proj.repo_path.trim() })
  if (proj?.docs_path && proj.docs_path.trim()) roots.push({ tag: 'docs', root: proj.docs_path.trim() })
  if (roots.length === 0) roots.push({ tag: 'repo', root: REPO_ROOT })

  const out = []
  function walk(root, rel) {
    let entries
    try { entries = _readdirSync(path.join(root, rel), { withFileTypes: true }) }
    catch { return }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.gitignore' && e.name !== '.env.example') continue
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue
        walk(root, path.join(rel, e.name))
      } else if (e.isFile()) {
        out.push(path.join(rel, e.name))
        if (out.length > 5000) return
      }
    }
  }
  for (const r of roots) {
    const before = out.length
    walk(r.root, '')
    // (Tag derzeit ungenutzt im Frontend — alle Dateien gemeinsam returned.)
    void before
  }
  fileCacheByProject.set(projectId, { mtime: now, files: out })
  return out
}

app.get('/api/projects/:id/files', (req, res) => {
  const projectId = Number(req.params.id)
  const q = String(req.query.q || '').toLowerCase().trim()
  const all = listProjectFiles(projectId)
  const matches = q
    ? all.filter(f => f.toLowerCase().includes(q))
    : all
  res.json({ files: matches.slice(0, 100), total: matches.length })
})

// GET /api/projects/:id — Einzelnes Projekt mit Counts (DD-5). DD-390: :id darf id ODER slug sein.
app.get('/api/projects/:id', (req, res) => {
  const pid = resolveProjectId(req.params.id)
  if (pid === null) return res.status(404).json({ error: 'Projekt nicht gefunden' })
  // T-be3 (Backend-I05): Counts-Aggregat via Lib (milestone/memory + active_sprint additiv).
  const row = getProjectWithCounts(db, pid)
  if (!row) return res.status(404).json({ error: 'Projekt nicht gefunden' })
  res.json(row)
})

// DD-368 (D05): Reservierte Slugs — kollidieren mit globalen Top-Level-Routen
// (/projects, /settings, /memories/global, …) oder API-/Infra-Pfaden.
const RESERVED_PROJECT_SLUGS = new Set([
  'projects', 'settings', 'dashboard', 'memories', 'assets', 'api', 'ws', 'health', 'ready',
  // DD-392: global authed capture route on devdash.* (/capture).
  'capture',
])

app.post('/api/projects', (req, res) => {
  const { slug, name, description, color, prefix, repo_path } = req.body
  if (!slug || !name || !prefix) return res.status(400).json({ error: 'slug, name, prefix sind Pflicht' })
  if (!/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ error: 'slug nur a-z 0-9 - erlaubt' })
  // DD-368 (D05): Reserved-Words-Guard — Projekt-Slugs belegen das erste Pfad-
  // Segment und dürfen nicht mit globalen Top-Level-Routen kollidieren.
  if (RESERVED_PROJECT_SLUGS.has(slug)) return res.status(400).json({ error: `slug "${slug}" ist reserviert` })
  if (!/^[A-Z0-9]{2,6}$/.test(prefix)) return res.status(400).json({ error: 'prefix 2-6 Großbuchstaben/Ziffern' })
  try {
    const result = db.prepare(`
      INSERT INTO projects (slug, name, description, color, prefix, repo_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(slug, name, description || null, color || '#cba6f7', prefix, repo_path || null)
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(row)
  } catch (e) {
    const msg = String(e.message)
    if (msg.includes('projects.slug')) return res.status(409).json({ error: 'slug bereits vergeben' })
    if (msg.includes('projects.prefix') || msg.includes('idx_projects_prefix')) return res.status(409).json({ error: 'prefix bereits vergeben' })
    if (msg.includes('UNIQUE')) return res.status(409).json({ error: 'slug oder prefix bereits vergeben' })
    res.status(500).json({ error: msg })
  }
})

// PUT /api/projects/:id — Projekt-Felder editieren (DD-5)
//
// Editierbar: name (Pflicht, nicht leer), description, color, archived,
// storybook_url (DD-520, ehem. Preview-URL umgewidmet). slug und prefix sind read-only
// (UNIQUE-Constraints, in Issue-Keys eingebrannt).
app.put('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' })

  // DD-392: public_capture (per-project public-exposure flag) is editable here.
  // DD-490: summary_achieved/summary_next/vision/goals — user-editable Project-Home
  // Overview prose (persisted, NOT AI-generated; goals is newline-delimited).
  const writable = ['name', 'description', 'color', 'archived', 'storybook_url', 'repo_path', 'docs_path', 'context_file_path', 'public_capture', 'summary_achieved', 'summary_next', 'vision', 'goals']
  const sets = []
  const vals = []
  for (const key of writable) {
    if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue
    const value = req.body[key]
    if (key === 'name' && (value == null || String(value).trim() === '')) {
      return res.status(400).json({ error: 'name darf nicht leer sein' })
    }
    if (key === 'public_capture') {
      // better-sqlite3 cannot bind booleans → coerce to 0/1.
      sets.push(`${key} = ?`)
      vals.push(value ? 1 : 0)
      continue
    }
    sets.push(`${key} = ?`)
    vals.push(value === '' ? null : value)
  }

  if (sets.length === 0) return res.json(project)

  sets.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(req.params.id)
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id))
})

// --- user_notes (DD2-161, ehem. session_notes/ProjectPages T-be1) — project-gescopt
// (currentProjectId), separate Rich-Entity (kein SSTD-Session-Log-Ersatz). Speist UserNotesWidget. ---
function _sendUserNoteError(res, e) {
  if (e instanceof UserNoteError) {
    return res.status(e.statusCode).json({ error: e.message, code: e.code, field: e.field })
  }
  console.error('[user-notes] unexpected error', e)
  return res.status(500).json({ error: 'Internal server error' })
}

app.get('/api/user-notes', (req, res) => {
  res.json(listUserNotes(db, currentProjectId(req), { search: req.query.search }))
})

app.get('/api/user-notes/:id', (req, res) => {
  const note = getUserNote(db, currentProjectId(req), Number(req.params.id))
  if (!note) return res.status(404).json({ error: 'user_note nicht gefunden', code: 'NOTE_NOT_FOUND' })
  res.json(note)
})

app.post('/api/user-notes', (req, res) => {
  try {
    res.status(201).json(createUserNote(db, currentProjectId(req), req.body || {}))
  } catch (e) {
    return _sendUserNoteError(res, e)
  }
})

app.put('/api/user-notes/:id', (req, res) => {
  try {
    res.json(updateUserNote(db, currentProjectId(req), Number(req.params.id), req.body || {}))
  } catch (e) {
    return _sendUserNoteError(res, e)
  }
})

app.delete('/api/user-notes/:id', (req, res) => {
  const ok = deleteUserNote(db, currentProjectId(req), Number(req.params.id))
  if (!ok) return res.status(404).json({ error: 'user_note nicht gefunden', code: 'NOTE_NOT_FOUND' })
  res.status(204).end()
})

// --- documents (DD2-21) — Markdown-Dokumente an Meilensteine ODER Sprints (DB-Blob).
// Owner kommt aus der Route (/api/milestones/:id/documents bzw. /api/sprints/:id/documents),
// nicht aus dem Body. ON DELETE CASCADE räumt sie beim Löschen des Owners. ---
function _sendDocumentError(res, e) {
  if (e instanceof DocumentError) {
    return res.status(e.statusCode).json({ error: e.message, code: e.code, field: e.field })
  }
  console.error('[documents] unexpected error', e)
  return res.status(500).json({ error: 'Internal server error' })
}

// Verifiziert, dass der Owner (milestone|sprint) existiert; sonst 404 + null.
function _resolveDocOwner(res, type, idParam) {
  const id = Number(idParam)
  const table = type === 'milestone' ? 'milestones' : 'sprints'
  const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)
  if (!row) { res.status(404).json({ error: `${type} not found` }); return null }
  return { type, id }
}

function _registerDocumentRoutes(type, base) {
  app.get(`${base}/:id/documents`, (req, res) => {
    const owner = _resolveDocOwner(res, type, req.params.id); if (!owner) return
    res.json(listDocuments(db, owner))
  })
  app.post(`${base}/:id/documents`, (req, res) => {
    const owner = _resolveDocOwner(res, type, req.params.id); if (!owner) return
    try { res.status(201).json(createDocument(db, owner, req.body || {})) }
    catch (e) { return _sendDocumentError(res, e) }
  })
  app.get(`${base}/:id/documents/:docId`, (req, res) => {
    const owner = _resolveDocOwner(res, type, req.params.id); if (!owner) return
    const doc = getDocument(db, owner, Number(req.params.docId))
    if (!doc) return res.status(404).json({ error: 'document nicht gefunden', code: 'DOC_NOT_FOUND' })
    res.json(doc)
  })
  app.put(`${base}/:id/documents/:docId`, (req, res) => {
    const owner = _resolveDocOwner(res, type, req.params.id); if (!owner) return
    try { res.json(updateDocument(db, owner, Number(req.params.docId), req.body || {})) }
    catch (e) { return _sendDocumentError(res, e) }
  })
  app.delete(`${base}/:id/documents/:docId`, (req, res) => {
    const owner = _resolveDocOwner(res, type, req.params.id); if (!owner) return
    const ok = deleteDocument(db, owner, Number(req.params.docId))
    if (!ok) return res.status(404).json({ error: 'document nicht gefunden', code: 'DOC_NOT_FOUND' })
    res.status(204).end()
  })
}
_registerDocumentRoutes('milestone', '/api/milestones')
_registerDocumentRoutes('sprint', '/api/sprints')

// DD2-163 (Rework): projektweite Doc-Liste (entitätsübergreifend) für den globalen
// Docs-Browser. owner_type/owner_name werden mitgeliefert. read-only Aggregat.
app.get('/api/projects/:projectId/documents', (req, res) => {
  try { res.json(listAllDocuments(db, Number(req.params.projectId))) }
  catch (e) { return _sendDocumentError(res, e) }
})

app.delete('/api/projects/:id', (req, res) => {
  const id = Number(req.params.id)
  if (id === 1) return res.status(400).json({ error: 'Initial-Projekt kann nicht gelöscht werden' })
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sprints WHERE project_id = ?) as sprints,
      (SELECT COUNT(*) FROM backlog WHERE project_id = ?) as backlog
  `).get(id, id)
  if (counts.sprints > 0 || counts.backlog > 0) {
    return res.status(409).json({ error: `Projekt enthält ${counts.sprints} Sprints und ${counts.backlog} Backlog-Items — vorher leeren oder archivieren` })
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  res.status(204).end()
})

// --- Sprints ---
app.get('/api/sprints', (req, res) => {
  const projectId = currentProjectId(req)
  const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : ''

  const conditions = ['s.project_id = ?']
  const params = [projectId]
  if (statusFilter) {
    const wanted = statusFilter.split(',').map(x => x.trim()).filter(Boolean)
    if (wanted.length === 1) {
      conditions.push('s.status = ?')
      params.push(wanted[0])
    } else if (wanted.length > 1) {
      conditions.push(`s.status IN (${wanted.map(() => '?').join(',')})`)
      params.push(...wanted)
    }
  }
  // DD-554: server-seitiger Milestone-Filter — 'none'/'null' → unassigned (milestone_id IS NULL),
  // ansonsten exakte milestone_id. Kombinierbar mit dem Status-Filter (AND). Analog status-Filter.
  const milestoneFilter = typeof req.query.milestone_id === 'string' ? req.query.milestone_id.trim() : ''
  if (milestoneFilter) {
    if (milestoneFilter === 'none' || milestoneFilter === 'null') {
      conditions.push('s.milestone_id IS NULL')
    } else if (/^\d+$/.test(milestoneFilter)) {
      conditions.push('s.milestone_id = ?')
      params.push(Number(milestoneFilter))
    }
  }

  const sprints = db.prepare(`
    SELECT s.*,
      m.name AS milestone_name,
      p.prefix AS project_prefix,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id) as item_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'completed') as done_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND (SELECT rf.review_status FROM review_feedback rf WHERE rf.backlog_id = b.id ORDER BY rf.round_number DESC, rf.id DESC LIMIT 1) = 'passed') as passed_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('completed','passed','cancelled')) as terminal_count
    FROM sprints s
    LEFT JOIN milestones m ON m.id = s.milestone_id
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY s.position, s.id
  `).all(...params)
  for (const s of sprints) {
    if (s.project_prefix && s.project_number != null) {
      s.key = `${s.project_prefix}#${s.project_number}`
    }
  }
  sendList(req, res, sprints, COMPACT_SPRINT_KEYS)   // DD-620: Compact-Default (?fields=full opt-in)
})

app.get('/api/sprints/:id', (req, res) => {
  const sprint = db.prepare(`
    SELECT s.*, p.prefix AS project_prefix
    FROM sprints s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.id = ?
  `).get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })
  let items = db.prepare(`
    SELECT b.*,
           rf.id           as feedback_id,
           rf.review_status as review_status,
           rf.comment      as review_comment,
           rf.notes        as review_notes,
           rf.round_number as review_round,
           p.prefix as project_prefix
    FROM backlog b
    LEFT JOIN review_feedback rf ON rf.backlog_id = b.id
      AND rf.id = (SELECT MAX(id) FROM review_feedback WHERE backlog_id = b.id)
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.assigned_sprint = ?
    ORDER BY b.priority, b.id
  `).all(req.params.id)

  // Attach screenshot file_paths per item
  for (const item of items) {
    if (item.feedback_id) {
      item.screenshot_files = db.prepare(
        'SELECT id, file_path FROM review_screenshots WHERE feedback_id = ?'
      ).all(item.feedback_id).map(s => s.file_path)
    } else {
      item.screenshot_files = []
    }
  }

  const tagMap = tagsForBacklog(items.map(i => i.id))
  for (const i of items) {
    i.tags = tagMap.get(i.id) || []
    if (i.project_prefix && i.project_number != null) {
      i.key = `${i.project_prefix}-${i.project_number}`
    }
    // DD-45 R07: Sub-Tasks pro Issue mitliefern, damit CLI sprint:context
    // und MCP sprint:show sie in Markdown/JSON rendern koennen.
    i.subtasks = listSubtasks(db, i.id)
    // E01.2: User Stories pro Issue mitliefern (Pruefgrundlage; Review/CLI/MCP).
    i.user_stories = listUserStories(db, i.id)
    // MEM-14: Dependency-Zähler pro Issue (Topologie-Signal für Sprint-Planung).
    i.deps = countIssueDependencies(db, i.id)
    // DD2-225: alle Review-Runden (round/verdict/comment) für die Cockpit-Historie.
    // Das LEFT JOIN oben liefert nur die LETZTE Runde (rf.id=MAX) → bei rejected+auto-
    // reopen ist sie 'pending'/leer und versteckte den Reject-Kommentar. Hier die volle
    // Historie als Array, aufsteigend nach Runde.
    i.review_rounds = db.prepare(
      'SELECT round_number AS round, review_status AS verdict, comment FROM review_feedback WHERE backlog_id = ? ORDER BY round_number, id'
    ).all(i.id)
  }

  if (sprint.project_prefix && sprint.project_number != null) {
    sprint.key = `${sprint.project_prefix}#${sprint.project_number}`
  }

  res.json({ ...sprint, items })
})

// POST /api/sprints/:id/review-submit — "Review abschliessen" (DD-507).
// Setzt sprints.review_submitted_at = CURRENT_TIMESTAMP (re-submit refresht nur
// den Timestamp, idempotent-ish). Kein all-passed Gate hier — der gehoert zu
// sprint complete. Dieser Marker ist rein das "Ich bin mit diesem Review-Pass
// fertig"-Signal des PO. Returns die aktualisierte Sprint-Zeile.
app.post('/api/sprints/:id/review-submit', (req, res) => {
  const sprintId = Number(req.params.id)
  const updated = submitSprintReview(db, sprintId, auditLog)
  if (!updated) return res.status(404).json({ error: 'Sprint not found' })
  res.json(updated)
})

app.get('/api/sprints/:id/context', (req, res) => {
  const sprint = db.prepare(`
    SELECT s.*, p.prefix AS project_prefix
    FROM sprints s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.id = ?
  `).get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })

  let items = db.prepare(`
    SELECT b.*,
           rf.review_status, rf.comment AS review_comment, rf.notes AS review_notes, rf.round_number AS review_round,
           p.prefix AS project_prefix
    FROM backlog b
    LEFT JOIN review_feedback rf ON rf.backlog_id = b.id
      AND rf.id = (SELECT MAX(id) FROM review_feedback WHERE backlog_id = b.id)
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.assigned_sprint = ?
    ORDER BY b.priority, b.id
  `).all(req.params.id)

  for (const i of items) {
    if (i.project_prefix && i.project_number != null) {
      i.key = `${i.project_prefix}-${i.project_number}`
    }
    // DD2-141: Kontext-Payload additiv anreichern, damit der Coding-Agent
    // ohne Extra-Calls arbeitet. DD2-96 user_stories (inkl. qa), DD2-92
    // Issue-Dependencies (blockers/blocked_by).
    i.user_stories = listUserStories(db, i.id)
    i.dependencies = listIssueDependencies(db, i.id)
  }
  if (sprint.project_prefix && sprint.project_number != null) {
    sprint.key = `${sprint.project_prefix}#${sprint.project_number}`
  }
  // DD2-92: Sprint-Dependencies (predecessors/successors).
  sprint.dependencies = getDependenciesForSprint(db, sprint.id)

  if (req.query.format === 'markdown') {
    return res.type('text/plain').send(buildSprintContextMarkdown(sprint, items))
  }

  res.json({ ...sprint, items })
})

// DD-184: Screenshot-Bundle für einen Sprint — liefert pro Issue alle
// Backlog-Attachments (image/*) und Review-Screenshots als JSON-Array.
// Optimiert für CLI-Nutzung durch KI-Agenten — keine Browser-Abhängigkeit.
app.get('/api/sprints/:id/screenshots', (req, res) => {
  const sprintId = parseInt(req.params.id, 10)
  if (Number.isNaN(sprintId)) return res.status(400).json({ error: 'Invalid sprint id' })
  const projectId = currentProjectId(req)

  const items = db.prepare(`
    SELECT b.id, b.title, b.project_number, p.prefix AS project_prefix
    FROM backlog b
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.assigned_sprint = ? AND b.project_id = ?
    ORDER BY b.id
  `).all(sprintId, projectId)

  const out = []
  for (const it of items) {
    const issueKey = it.project_prefix && it.project_number
      ? `${it.project_prefix}-${it.project_number}`
      : null

    const atts = db.prepare(`
      SELECT id, file_path, mime_type, caption, created_at
      FROM backlog_attachments
      WHERE backlog_id = ?
      ORDER BY id
    `).all(it.id)
    for (const a of atts) {
      if (a.mime_type && !a.mime_type.startsWith('image/')) continue
      out.push({
        issue_id: it.id,
        issue_key: issueKey,
        source: 'attachment',
        feedback_id: null,
        attachment_id: a.id,
        filename: a.file_path,
        url: `/uploads/${a.file_path}`,
        mime_type: a.mime_type || null,
        caption: a.caption || null,
        created_at: a.created_at || null,
      })
    }

    const fbs = db.prepare('SELECT id FROM review_feedback WHERE backlog_id = ?').all(it.id)
    for (const fb of fbs) {
      const shots = db.prepare(`
        SELECT id, file_path, caption, created_at
        FROM review_screenshots
        WHERE feedback_id = ?
        ORDER BY id
      `).all(fb.id)
      for (const s of shots) {
        out.push({
          issue_id: it.id,
          issue_key: issueKey,
          source: 'review',
          feedback_id: fb.id,
          attachment_id: s.id,
          filename: s.file_path,
          url: `/uploads/${s.file_path}`,
          mime_type: null,
          caption: s.caption || null,
          created_at: s.created_at || null,
        })
      }
    }
  }
  res.json(out)
})

// DD-386: PO-Review-Ergebnisse pro Issue eines Sprints. Liefert je Backlog-Item
// das letzte Review-Verdict (passed/not_passed/pending|null),
// den vollständigen Review-Kommentar und die Screenshots der letzten
// Review-Runde. DD-387: Screenshot-URLs sind RELATIV (`/uploads/<file_path>`),
// niemals absolut mit Host:Port. Pendant zu MCP `devd_sprint_rev_results`.
app.get('/api/sprints/:id/rev-results', (req, res) => {
  const sprintId = parseInt(req.params.id, 10)
  if (Number.isNaN(sprintId)) return res.status(400).json({ error: 'Invalid sprint id' })
  const projectId = currentProjectId(req)

  const sprint = db.prepare(
    'SELECT id FROM sprints WHERE id = ? AND project_id = ?'
  ).get(sprintId, projectId)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })

  const items = db.prepare(`
    SELECT b.id, b.title, b.status, b.project_number,
           p.prefix AS project_prefix,
           rf.id            AS feedback_id,
           rf.review_status AS review_status,
           rf.comment       AS review_comment
    FROM backlog b
    LEFT JOIN review_feedback rf ON rf.backlog_id = b.id
      AND rf.id = (SELECT MAX(id) FROM review_feedback WHERE backlog_id = b.id)
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.assigned_sprint = ? AND b.project_id = ?
    ORDER BY b.priority, b.id
  `).all(sprintId, projectId)

  const out = items.map((it) => {
    const key = it.project_prefix && it.project_number != null
      ? `${it.project_prefix}-${it.project_number}`
      : null
    let screenshot_files = []
    if (it.feedback_id) {
      screenshot_files = db.prepare(
        'SELECT id, file_path FROM review_screenshots WHERE feedback_id = ? ORDER BY id'
      ).all(it.feedback_id).map((s) => ({
        id: s.id,
        file_path: s.file_path,
        // DD-387: relative, host-agnostische URL — nie absolut mit :5556.
        url: `/uploads/${s.file_path}`,
      }))
    }
    return {
      key,
      title: it.title,
      status: it.status,
      review_status: it.review_status || null,
      comment: it.review_comment || null,
      screenshot_files,
    }
  })

  res.json(out)
})

// --- Backlog ---
app.get('/api/backlog', (req, res) => {
  const projectId = currentProjectId(req)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : ''
  const sprintFilter = typeof req.query.sprint_id === 'string' || typeof req.query.sprint_id === 'number'
    ? String(req.query.sprint_id).trim()
    : ''
  const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim() : ''

  const conditions = ['b.project_id = ?']
  const params = [projectId]

  // DD-524: Soft-Delete (deleted_at) abgelöst durch cancelled-Status. Backlog-
  // LISTE liefert auch cancelled-Items zurück — das UI blendet sie per Toggle
  // aus (DD-525), konsistent zu cancelled Sprints/Milestones.

  if (search.length > 0) {
    // E01.2/D09: acceptance_criteria abgeloest (user_stories[].qa); aus Suche entfernt.
    conditions.push('(b.title LIKE ? OR b.context_notes LIKE ? OR b.goal LIKE ? OR b.background LIKE ?)')
    const like = `%${search}%`
    params.push(like, like, like, like)
  }

  if (statusFilter) {
    // Komma-Liste erlaubt: ?status=new,refined
    const wanted = statusFilter.split(',').map(s => s.trim()).filter(Boolean)
    if (wanted.length === 1) {
      conditions.push('b.status = ?')
      params.push(wanted[0])
    } else if (wanted.length > 1) {
      conditions.push(`b.status IN (${wanted.map(() => '?').join(',')})`)
      params.push(...wanted)
    }
  }

  if (typeFilter) {
    conditions.push('b.type = ?')
    params.push(typeFilter)
  }

  // T-be4 (Backend-I06/D01): priority-Filter (?priority=1 oder Komma-Liste 1-5).
  // Speist Prio-1-Backlog (ProjectHome ChildrenWidget).
  const prio = priorityFilter(req.query.priority)
  if (prio) {
    conditions.push(prio.clause)
    params.push(...prio.params)
  }

  if (sprintFilter) {
    if (sprintFilter === 'null' || sprintFilter === 'none') {
      conditions.push('b.assigned_sprint IS NULL')
    } else {
      const n = Number(sprintFilter)
      if (Number.isFinite(n)) {
        conditions.push('b.assigned_sprint = ?')
        params.push(n)
      }
    }
  }

  let items = db.prepare(`
    SELECT b.*, s.name as sprint_name, s.project_number as sprint_project_number,
      rf.status as review_status,
      p.prefix as project_prefix
    FROM backlog b
    LEFT JOIN sprints s ON s.id = b.assigned_sprint
    LEFT JOIN review_feedback rf ON rf.backlog_id = b.id
      AND rf.id = (SELECT MAX(id) FROM review_feedback WHERE backlog_id = b.id)
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY b.priority, b.id
  `).all(...params)
  const tagMap = tagsForBacklog(items.map(i => i.id))
  for (const i of items) {
    i.tags = tagMap.get(i.id) || []
    // DD-Lessons CONOS 2026-05-07: `key` direkt in Response, damit Konsumenten
    // (MCP, externe Tools) nicht selbst `prefix-project_number` zusammensetzen.
    if (i.project_prefix && i.project_number != null) {
      i.key = `${i.project_prefix}-${i.project_number}`
    }
    if (i.project_prefix && i.sprint_project_number != null) {
      i.sprint_key = `${i.project_prefix}#${i.sprint_project_number}`
    }
  }
  sendList(req, res, items, COMPACT_BACKLOG_KEYS)   // DD-620: Compact-Default (?fields=full opt-in)
})

// GET /api/milestones — Erste-Klasse Milestones aus milestones-Tabelle.
// Liefert pro Milestone: id, name, description, target_date, status,
// zugehoerige Sprints + Aggregat-Counts (aus Sprint-Subquery summiert).
//
// DD-292: items[] (Backlog-Items) NICHT mehr Teil der Response — Backlog
// gehört nicht in /milestones. Counts werden aus den per-Sprint-Aggregaten
// (issue_total/issue_done/issue_cancelled aus der Sprint-Subquery) summiert,
// damit die Milestone-Card ihre ProgressBar weiterhin rendern kann.
// noneBucket bleibt erhalten, transportiert aber NUR Sprints ohne
// milestone_id (Drag-Source per DD-172) — keine Items.
app.get('/api/milestones', (req, res) => {
  const projectId = currentProjectId(req)
  // DD-135: Sortierung primär nach position (manuell gepflegt), sekundär nach
  // operativen Milestones (planning/active) und target_date als deterministischer Fallback.
  // DD-256 (T04 M02-S01): Filter status=open (Default) | all
  // DD-306 (2026-05-24): 'open' wird als Alias für planning OR active behandelt (Backward-Compat).
  //   Neue Filter-Werte: planning|active|completed|cancelled (Migration 038).
  let statusFilter
  try { statusFilter = validateStatusFilter(req.query.status) } catch (e) { return sendValidationError(res, e) }
  let statusClause = ''
  if (statusFilter === 'open') {
    statusClause = `AND status IN ('new','planned','in_progress')`
  } else if (statusFilter !== 'all') {
    statusClause = `AND status = '${statusFilter}'`
  }
  // DD-291: deferred Milestones (deferred=1) werden im Default-Filter ausgeblendet.
  // include_deferred=true liefert ALLE (für Indikator-Pill-Popover + State D im
  // RoadmapBoard mit Filter-Toggle). Boolean-Flag ist orthogonal zu status (D01).
  const includeDeferred = String(req.query.include_deferred || '').toLowerCase() === 'true'
  const deferredClause = includeDeferred ? '' : 'AND deferred = 0'
  const milestones = db.prepare(`
    SELECT id, name, description, target_date, status, created_at, position, deferred
    FROM milestones
    WHERE project_id = ? ${statusClause} ${deferredClause}
    ORDER BY position IS NULL, position ASC, status IN ('new','planned','in_progress') DESC, target_date IS NULL, target_date ASC, id ASC
  `).all(projectId)

  const sprintsByMilestone = new Map()
  // DD-290: Sprint-Subquery liefert Felder, die SprintPill + Sprint-Row in der
  // refactored MilestoneView/-Card rendern: project_prefix (für key "DD#NN"),
  // goal, position, start_date, end_date, plus Issue-Counts (total/done).
  // DD-292: Zusätzlich issue_cancelled — damit der Milestone-Bucket cancelled
  // aggregieren kann, ohne Backlog-Items im Response zu transportieren.
  const allSprints = db.prepare(`
    SELECT s.id, s.name, s.goal, s.status, s.milestone_id, s.position,
           s.project_number, s.start_date, s.end_date,
           p.prefix AS project_prefix,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status != 'cancelled') AS issue_total,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('completed','passed')) AS issue_done,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'cancelled') AS issue_cancelled
    FROM sprints s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.project_id = ?
    ORDER BY s.position IS NULL, s.position ASC, s.id ASC
  `).all(projectId)
  for (const s of allSprints) {
    // DD-290 / DD-294: Sprint-Key analog zu sprintKey()/displayId() —
    // "<PREFIX>#<NR>". Wird vom SprintPill-Atom als sichtbares Label genutzt.
    if (s.project_prefix && s.project_number != null) {
      s.key = `${s.project_prefix}#${s.project_number}`
    }
    if (s.milestone_id == null) continue
    if (!sprintsByMilestone.has(s.milestone_id)) sprintsByMilestone.set(s.milestone_id, [])
    sprintsByMilestone.get(s.milestone_id).push(s)
  }

  // DD-172: noneBucket bekommt alle planning/active Sprints ohne milestone_id
  // als Drag-Source fuer Milestone-Zuordnung. review/completed/closed/cancelled
  // sind final — Milestone-Zuordnung dort nicht mehr sinnvoll.
  const sprintsWithoutMilestone = allSprints.filter(s =>
    s.milestone_id == null && (s.status === 'new' || s.status === 'planned' || s.status === 'in_progress')
  )
  // DD-293 R2: Zusätzlich abgeschlossene Sprints (completed/closed/review)
  // ohne milestone_id als separates Feld backfill_sprints[] im noneBucket
  // ausliefern. Diese erscheinen in der MilestoneView als „Sprints ohne
  // Milestone-Zuordnung" am Ende der Liste — mit Inline-Picker (kein D&D, weil
  // optisch nicht-draggable, abgeschlossene Sprints brauchen einen expliziten
  // Picker analog RoadmapBoard-Backfill).
  const backfillSprintsWithoutMilestone = allSprints.filter(s =>
    s.milestone_id == null && (s.status === 'completed' || s.status === 'to_review')
  )

  // DD-292: Aggregat-Counts ausschließlich aus den per-Sprint-Werten summieren.
  // bucket.total = Σ issue_total, bucket.done = Σ issue_done,
  // bucket.cancelled = Σ issue_cancelled, bucket.terminal_count = done + cancelled.
  // Backlog-Items (ohne assigned_sprint) fließen NICHT mehr ein.
  const aggregateFromSprints = (sprints) => {
    let total = 0, done = 0, cancelled = 0
    for (const sp of sprints) {
      total += sp.issue_total || 0
      done += sp.issue_done || 0
      cancelled += sp.issue_cancelled || 0
    }
    return { total, done, cancelled, terminal_count: done + cancelled }
  }

  // DD2-143: Tags aller Milestones in einem Query (kein N+1), in den Bucket embedden.
  const milestoneTagMap = tagsForMilestones(milestones.map(m => m.id))

  const newBucket = (milestone) => {
    const sprints = milestone?.id
      ? (sprintsByMilestone.get(milestone.id) || [])
      : sprintsWithoutMilestone
    const counts = milestone?.id ? aggregateFromSprints(sprints) : { total: 0, done: 0, cancelled: 0, terminal_count: 0 }
    const bucket = {
      ...milestone,
      sprints,
      tags: milestone?.id ? (milestoneTagMap.get(milestone.id) || []) : [],
      ...counts,
    }
    // DD-293 R2: backfill_sprints[] nur im noneBucket (Milestone-Buckets
    // brauchen kein Backfill, da bereits zugeordnet).
    if (!milestone?.id) {
      bucket.backfill_sprints = backfillSprintsWithoutMilestone
    }
    return bucket
  }
  const buckets = new Map(milestones.map(m => [m.id, newBucket(m)]))
  const noneBucket = newBucket(null)

  const list = [...buckets.values()]
  // DD-172/DD-292: noneBucket nur dann anhängen, wenn Sprints ohne milestone_id
  // existieren (Drag-Source). Backlog-Items werden NICHT mehr eingerechnet.
  // DD-293 R2: ODER wenn Backfill-Kandidaten (abgeschlossene Sprints ohne
  // Milestone-Zuordnung) existieren — diese erscheinen in der MilestoneView
  // als separate Section am Ende.
  if (noneBucket.sprints.length > 0 || (noneBucket.backfill_sprints && noneBucket.backfill_sprints.length > 0)) list.push(noneBucket)
  res.json(list)
})

// DD-291: GET /api/milestones/deferred-stats — Subheader-Stats für
// Indikator-Pill (MilestoneView) und State-D Subheader (RoadmapBoard).
// Liefert deferred_count (Anzahl deferred Milestones) + deferred_sprints_count
// (Sprints deren milestone_id einem deferred Milestone gehört).
// MUSS vor /api/milestones/:id deklariert werden (sonst matcht :id="deferred-stats").
app.get('/api/milestones/deferred-stats', (req, res) => {
  const projectId = currentProjectId(req)
  const deferredRows = db.prepare(`
    SELECT id, name FROM milestones
    WHERE project_id = ? AND deferred = 1
    ORDER BY position IS NULL, position ASC, id ASC
  `).all(projectId)
  const deferredIds = deferredRows.map(r => r.id)
  let deferredSprintsCount = 0
  if (deferredIds.length > 0) {
    const placeholders = deferredIds.map(() => '?').join(',')
    const row = db.prepare(`
      SELECT COUNT(*) AS c FROM sprints
      WHERE project_id = ? AND milestone_id IN (${placeholders})
    `).get(projectId, ...deferredIds)
    deferredSprintsCount = row?.c || 0
  }
  res.json({
    deferred_count: deferredRows.length,
    deferred_sprints_count: deferredSprintsCount,
    milestones: deferredRows,
  })
})

// CRUD /api/milestones — Erstellen/Editieren/Loeschen.
// DD-135: PATCH /api/milestones/reorder — Bulk-Update der Sortierreihenfolge.
// Body: { ordered_ids: number[] } setzt position = Index für die übergebenen IDs.
// MUSS vor /api/milestones/:id deklariert werden (sonst matcht :id="reorder").
app.patch('/api/milestones/reorder', (req, res) => {
  const projectId = currentProjectId(req)
  const { ordered_ids } = req.body || {}
  if (!Array.isArray(ordered_ids)) return res.status(400).json({ error: 'ordered_ids[] required' })
  // Nur eigene Milestones — Cross-Project-Reorder verbieten.
  const placeholders = ordered_ids.map(() => '?').join(',')
  const own = ordered_ids.length === 0 ? [] : db.prepare(
    `SELECT id, position FROM milestones WHERE project_id = ? AND id IN (${placeholders})`
  ).all(projectId, ...ordered_ids)
  if (own.length !== ordered_ids.length) {
    return res.status(422).json({ error: 'Mindestens eine ID gehört nicht zum aktiven Projekt' })
  }
  // DD-288: audit_log Eintrag pro umsortiertem Milestone (action='milestone_reorder').
  const oldPosById = new Map(own.map(r => [r.id, r.position]))
  const tx = db.transaction((ids) => {
    const upd = db.prepare('UPDATE milestones SET position = ? WHERE id = ?')
    ids.forEach((id, idx) => {
      const newPos = idx + 1
      const oldPos = oldPosById.get(id)
      if (oldPos === newPos) return // No-op
      upd.run(newPos, id)
      auditLog('milestones', id, 'milestone_reorder',
        { position: oldPos },
        { position: newPos },
        'ui')
    })
  })
  tx(ordered_ids)
  res.json({ ok: true, updated: ordered_ids.length })
})

app.post('/api/milestones', (req, res) => {
  const projectId = currentProjectId(req)
  // DD-256 (T04 M02-S01): name Pflicht (400). target_date wird via resolveTargetDate auto-defaulted (Finding #2).
  try { validateMilestonePayload(req.body, { operation: 'create' }) } catch (e) { return sendValidationError(res, e) }
  const { name, description, target_date, status } = req.body || {}
  const resolvedTargetDate = resolveTargetDate(target_date)
  try {
    const maxPos = db.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM milestones WHERE project_id = ?').get(projectId).m
    const result = db.prepare(`
      INSERT INTO milestones (project_id, name, description, target_date, status, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, String(name).trim(), description ? String(description).trim() || null : null, resolvedTargetDate, status || 'new', maxPos + 1)
    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(milestone)
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Milestone-Name existiert bereits' })
    return res.status(500).json({ error: e.message })
  }
})

// DD-289 — GET /api/milestones/:id — Milestone-Detail mit Sprint-Liste,
// Dependencies (in/out), DoD-Items und aggregierten Issue-Counts.
// Wird vom MilestoneDetail-View (/milestone/:id) konsumiert.
//
// MUSS vor PUT/DELETE deklariert werden (selbe Route, anderes Verb — ok),
// aber unbedingt nach PATCH /api/milestones/reorder, da dort sonst :id="reorder"
// matchen würde. Reihenfolge: reorder → POST → GET-show → PUT → sub-routes.
app.get('/api/milestones/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid milestone id' })
  const milestone = db.prepare(`
    SELECT id, project_id, name, description, target_date, status,
           created_at, position, deferred
    FROM milestones
    WHERE id = ?
  `).get(id)
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' })

  // Sprint-Liste analog DD-290 GET /api/milestones — selbe Felder, gefiltert auf
  // diesen Milestone (Acceptance: SprintPill kann ohne weiteren Refetch rendern).
  const sprints = db.prepare(`
    SELECT s.id, s.name, s.goal, s.status, s.milestone_id, s.position,
           s.project_number, s.start_date, s.end_date,
           p.prefix AS project_prefix,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status != 'cancelled') AS issue_total,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('completed','passed')) AS issue_done,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'cancelled') AS issue_cancelled
    FROM sprints s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.milestone_id = ?
    ORDER BY s.position IS NULL, s.position ASC, s.id ASC
  `).all(id)
  for (const s of sprints) {
    if (s.project_prefix && s.project_number != null) {
      s.key = `${s.project_prefix}#${s.project_number}`
    }
  }

  // Aggregat-Counts analog GET /api/milestones (Backlog ohne assigned_sprint
  // fließt NICHT mehr ein — DD-292).
  let total = 0, done = 0, cancelled = 0
  for (const sp of sprints) {
    total += sp.issue_total || 0
    done += sp.issue_done || 0
    cancelled += sp.issue_cancelled || 0
  }
  const terminal_count = done + cancelled

  // DoD-Items + Dependencies via bestehende Helper.
  const dod_items = listDodItems(db, id)
  const { predecessors, successors } = getDependenciesForMilestone(db, id)
  // Mapping ans Mockup-Schema (dependencies_in/out mit Status der referenzierten
  // Milestones — benötigt zusätzlichen JOIN, da getDependenciesForMilestone den
  // status nicht mitliefert).
  const depIds = [...predecessors.map(p => p.id), ...successors.map(s => s.id)]
  const depStatusMap = new Map()
  if (depIds.length > 0) {
    const placeholders = depIds.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT id, status FROM milestones WHERE id IN (${placeholders})`
    ).all(...depIds)
    for (const r of rows) depStatusMap.set(r.id, r.status)
  }
  const dependencies_in = predecessors.map(p => ({
    id: p.id,
    name: p.name,
    status: depStatusMap.get(p.id) || null,
    dependency_id: p.dependency_id,
  }))
  const dependencies_out = successors.map(s => ({
    id: s.id,
    name: s.name,
    status: depStatusMap.get(s.id) || null,
    dependency_id: s.dependency_id,
  }))

  res.json({
    ...milestone,
    sprints,
    dod_items,
    dependencies_in,
    dependencies_out,
    total,
    done,
    cancelled,
    terminal_count,
  })
})

app.put('/api/milestones/:id', (req, res) => {
  const id = Number(req.params.id)
  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id)
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' })
  // DD-256 (T04 M02-S01): name darf nicht geleert werden (400), target_date darf nicht geleert werden (422)
  try { validateMilestonePayload(req.body, { operation: 'update' }) } catch (e) { return sendValidationError(res, e) }
  const oldName = milestone.name
  // DD-306 (2026-05-24): Status-Felder werden via patchMilestoneStatus (Lifecycle-validated)
  // gepatcht — nicht mehr im allgemeinen Writable-Loop. Wenn body.status gesetzt ist,
  // wird die Transition explizit validiert und Audit-Log geschrieben.
  if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
    try {
      // DD2-28: PO-getriggerte Cascade-Complete — statt am 422 SPRINTS_NOT_DONE zu
      // scheitern, setzt cascade:true offene Sprints + Issues terminal (nur status=completed).
      const wantCascade = req.body.cascade === true || req.body.cascade === 'true'
      const updated = (String(req.body.status) === 'completed' && wantCascade)
        ? cascadeCompleteMilestone(db, id, { agentId: req.body.agent_id || 'ui', auditLog })
        : patchMilestoneStatus(db, id, String(req.body.status), {
            cancellationNotes: req.body.cancellation_notes || req.body.cancellationNotes || null,
            agentId: req.body.agent_id || 'ui',
            auditLog,
          })
      // status-Update separat — andere Felder (name/description/target_date) im Loop unten,
      // wenn body sie ebenfalls enthält. Status ist schon persistiert.
      // Update milestone-Variable für UNIQUE-Check unten + Response.
      Object.assign(milestone, updated)
    } catch (e) {
      const code = e.statusCode || 500
      return res.status(code).json({ error: e.message, code: e.code, field: e.field })
    }
  }
  // DD-307: spec_path mit Path-Traversal-Reject.
  if (Object.prototype.hasOwnProperty.call(req.body, 'spec_path')) {
    try {
      const project = db.prepare('SELECT repo_path FROM projects WHERE id = ?').get(milestone.project_id)
      const validated = validateSpecPath(req.body.spec_path, { repoPath: project?.repo_path })
      db.prepare('UPDATE milestones SET spec_path = ? WHERE id = ?').run(validated, id)
      auditLog('milestones', id, 'milestone_spec_path_change',
        { spec_path: milestone.spec_path || null },
        { spec_path: validated },
        req.body.agent_id || 'ui')
    } catch (e) {
      if (e instanceof MilestoneSpecPathError) {
        return res.status(e.statusCode).json({ error: e.message, code: e.code, field: e.field })
      }
      throw e
    }
  }
  const writable = ['name', 'description', 'target_date']
  const sets = [], vals = []
  for (const key of writable) {
    if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue
    const v = req.body[key]
    sets.push(`${key} = ?`)
    // Finding #3 + #4: target_date wird auto-defaulted bei clear-Intent statt 422.
    // Finding #D6: description Whitespace zu NULL trimmen.
    if (key === 'target_date') {
      vals.push(resolveTargetDate(v, { createdAt: milestone.created_at }))
    } else if (key === 'description' && typeof v === 'string') {
      const trimmed = v.trim()
      vals.push(trimmed === '' ? null : trimmed)
    } else {
      vals.push(v === '' ? null : v)
    }
  }
  if (sets.length === 0) return res.json(milestone)
  vals.push(id)
  try {
    db.prepare(`UPDATE milestones SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Milestone-Name existiert bereits' })
    return res.status(500).json({ error: e.message })
  }
  const updated = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id)
  // Wenn der Name geaendert wurde, denormalisiertes backlog.milestone fuer
  // alle betroffenen Items aktualisieren.
  if (updated.name !== oldName) {
    const sprintIds = db.prepare('SELECT id FROM sprints WHERE milestone_id = ?').all(id).map(s => s.id)
    for (const sid of sprintIds) syncBacklogMilestoneForSprint(sid)
  }
  res.json(updated)
})

// DD-277: GET nicht-terminale Issues eines Milestones (Triage-Vorbereitung).
app.get('/api/milestones/:id/open-issues', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  const ms = db.prepare('SELECT id, name, status FROM milestones WHERE id = ?').get(id)
  if (!ms) return res.status(404).json({ error: 'Milestone not found' })
  try {
    const items = listOpenIssuesForMilestone(db, id)
    res.json({ milestone: ms, items })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DD-277: Milestone schließen + nicht-terminale Issues triagieren (atomar).
// Body: { target_status: 'completed'|'cancelled', assignments: [{issue_id, target}] }
//   target ∈ {'backlog', 'completed', 'cancelled'}
app.post('/api/milestones/:id/close-with-issues', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  const body = req.body || {}
  try {
    const result = closeMilestoneWithIssues(db, {
      milestoneId: id,
      targetStatus: body.target_status,
      assignments: body.assignments,
    }, { auditLog })
    res.json(result)
  } catch (e) {
    if (e instanceof MilestoneCloseError) {
      const payload = { error: e.message }
      if (e.field) payload.field = e.field
      return res.status(e.statusCode || 400).json(payload)
    }
    res.status(500).json({ error: e.message })
  }
})

// GET /api/milestones/:id/delete-preview — Counts für den TUI-Confirm (T02b).
app.get('/api/milestones/:id/delete-preview', (req, res) => {
  const id = Number(req.params.id)
  const milestone = db.prepare('SELECT id, name FROM milestones WHERE id = ?').get(id)
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' })
  const p = milestoneDeletePreview(db, id)
  res.json({ milestone_id: id, milestone_name: milestone.name, sprints: p.sprints, issues: p.issues, documents: p.documents })
})

app.delete('/api/milestones/:id', (req, res) => {
  const id = Number(req.params.id)
  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id)
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' })
  const cascade = req.query.cascade === '1' || req.query.cascade === 'true'
  const preview = milestoneDeletePreview(db, id)

  if (cascade) {
    // Transaktional: erst alle Sprints (inkl. ihrer Issues + Kinder), dann der Meilenstein.
    db.transaction(() => {
      cascadeDeleteSprints(db, preview.sprintIds)
      db.prepare('DELETE FROM milestones WHERE id = ?').run(id)
    })()
    auditLog('milestones', id, 'delete_cascade', milestone, null, 'devd-ui')
    return res.json({ ok: true, deleted: { milestone_id: id, sprints: preview.sprints, issues: preview.issues, documents: preview.documents } })
  }

  // Legacy (ohne ?cascade=1): nur den Meilenstein; Sprints via FK ON DELETE SET NULL gelöst.
  db.prepare('DELETE FROM milestones WHERE id = ?').run(id)
  for (const sid of preview.sprintIds) syncBacklogMilestoneForSprint(sid)
  res.status(204).end()
})

// DD-291: PATCH /api/milestones/:id — partielle Update-Route speziell für
// das deferred-Flag. Vom PUT (full milestone update) bewusst getrennt,
// damit die Defer-Aktion ein eigenes audit_log-Event 'milestone_defer'
// bekommt und das Edit-Modal die deferred-Property separat schalten kann.
// Body: { deferred: boolean } — andere Felder werden ignoriert.
app.patch('/api/milestones/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid milestone id' })
  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id)
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' })
  if (!req.body || !Object.prototype.hasOwnProperty.call(req.body, 'deferred')) {
    return res.status(400).json({ error: 'deferred (boolean) ist Pflichtfeld' })
  }
  const raw = req.body.deferred
  // Akzeptiere boolean ODER 0/1 (Backward-Compat, SQLite-Native).
  let nextValue
  if (raw === true || raw === 1 || raw === '1' || raw === 'true') nextValue = 1
  else if (raw === false || raw === 0 || raw === '0' || raw === 'false') nextValue = 0
  else return res.status(400).json({ error: 'deferred muss boolean sein' })

  const oldValue = milestone.deferred ? 1 : 0
  if (oldValue === nextValue) {
    // No-op — keine DB-Mutation, keine Audit-Spur.
    return res.json(milestone)
  }
  try {
    db.prepare('UPDATE milestones SET deferred = ? WHERE id = ?').run(nextValue, id)
    auditLog('milestones', id, 'milestone_defer',
      { deferred: oldValue },
      { deferred: nextValue },
      'ui')
    const updated = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id)
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DD-257 (T05 M02-S01): milestone_dependencies CRUD + DFS-Cycle-Detection.
// GET /api/milestones/:id/dependencies → { predecessors: [...], successors: [...] }
app.get('/api/milestones/:id/dependencies', (req, res) => {
  // Finding #13: try/catch um SQL-Fehler nicht ungeschützt an Express Default-Handler zu propagieren.
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid milestone id' })
    const exists = db.prepare('SELECT 1 FROM milestones WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Milestone not found' })
    res.json(getDependenciesForMilestone(db, id))
  } catch (err) {
    console.error('[milestone-deps:get]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/milestone-dependencies { predecessor_id, successor_id }
// → 201, 400 (Self-Loop/missing-FK/Invalid-ID), 409 (Cycle/Duplicate), 422 (Cross-Project)
app.post('/api/milestone-dependencies', (req, res) => {
  const projectId = currentProjectId(req)
  const { predecessor_id, successor_id } = req.body || {}
  try {
    const id = insertDependency(db, { predecessor_id, successor_id, projectId })
    res.status(201).json({ id, predecessor_id, successor_id })
  } catch (err) {
    if (err.statusCode) {
      const body = { error: err.message, code: err.code }
      if (err.path) body.path = err.path
      return res.status(err.statusCode).json(body)
    }
    // Finding #11: Fallback 500 ohne err.message-Leak. Production-Stack soll nichts DB-Internes leaken.
    console.error('[milestone-deps] unexpected error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/milestone-dependencies/:id → 204
app.delete('/api/milestone-dependencies/:id', (req, res) => {
  const id = Number(req.params.id)
  const result = db.prepare('DELETE FROM milestone_dependencies WHERE id = ?').run(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Dependency not found' })
  res.status(204).end()
})

// GF-2 Wave D / D2 (T01): Sprint-Dependencies — 1:1-Mirror der Milestone-Dep-Endpoints
// (server/lib/sprintDependencies.js). Eliminiert textliche Sprint-Deps-Drift (D-E).
app.get('/api/sprints/:id/dependencies', (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid sprint id' })
    const exists = db.prepare('SELECT 1 FROM sprints WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Sprint not found' })
    res.json(getDependenciesForSprint(db, id))
  } catch (err) {
    console.error('[sprint-deps:get]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/sprint-dependencies { predecessor_id, successor_id }
// → 201, 400 (Self-Loop/missing-FK/Invalid-ID), 409 (Cycle/Duplicate), 422 (Cross-Project)
app.post('/api/sprint-dependencies', (req, res) => {
  const projectId = currentProjectId(req)
  const { predecessor_id, successor_id } = req.body || {}
  try {
    const id = insertSprintDependency(db, { predecessor_id, successor_id, projectId })
    res.status(201).json({ id, predecessor_id, successor_id })
  } catch (err) {
    if (err.statusCode) {
      const body = { error: err.message, code: err.code }
      if (err.path) body.path = err.path
      return res.status(err.statusCode).json(body)
    }
    console.error('[sprint-deps] unexpected error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/sprint-dependencies/:id → 204
app.delete('/api/sprint-dependencies/:id', (req, res) => {
  const id = Number(req.params.id)
  const result = db.prepare('DELETE FROM sprint_dependencies WHERE id = ?').run(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Dependency not found' })
  res.status(204).end()
})

// GF-2 Wave D / D4 (T03, D-L): Sprint-Completeness — eigener computed Endpoint (kein
// Enrichment von GET /api/sprints/:id, Back-Compat). Issues-only (keine Story-Points).
app.get('/api/sprints/:id/completeness', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid sprint id' })
  const exists = db.prepare('SELECT 1 FROM sprints WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ error: 'Sprint not found' })
  res.json(computeSprintCompleteness(db, id))
})

// GF-2 Wave D / D3 (T04): Activity-Read für Sprint + Milestone (mirror GET
// /api/backlog/:id/activity). Write-Seite existiert (auditLog). table_name-Reconcile:
// Sprint-Events liegen unter 'sprint' UND 'sprights' (Drift), Milestone unter 'milestones'
// → Read-Filter via IN (...) fängt beide Schreibweisen (non-destructive, BE-B02/B03).
function entityActivity(req, res, { parentTable, tableNames }) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  const exists = db.prepare(`SELECT 1 FROM ${parentTable} WHERE id = ?`).get(id)
  if (!exists) return res.status(404).json({ error: `${parentTable} not found` })
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200)
  const placeholders = tableNames.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT id, timestamp, agent_id, action, old_value, new_value
    FROM audit_log
    WHERE table_name IN (${placeholders}) AND record_id = ?
    ORDER BY id DESC LIMIT ?
  `).all(...tableNames, id, limit)
  res.json(rows)
}
app.get('/api/sprints/:id/activity', (req, res) =>
  entityActivity(req, res, { parentTable: 'sprints', tableNames: ['sprint', 'sprints'] }))
app.get('/api/milestones/:id/activity', (req, res) =>
  entityActivity(req, res, { parentTable: 'milestones', tableNames: ['milestone', 'milestones'] }))

// DD-258 (T06 M02-S01): milestone_dod_items CRUD + Reorder.
function _sendDodError(res, err) {
  if (err && err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code })
  }
  // Finding #11: 500-Fallback leakt keine DB-Internals (kein err.message), nur Console-Log.
  console.error('[dod-items] unexpected error', err)
  return res.status(500).json({ error: 'Internal server error' })
}

app.get('/api/milestones/:milestone_id/dod-items', (req, res) => {
  res.json(listDodItems(db, Number(req.params.milestone_id)))
})

app.post('/api/milestones/:milestone_id/dod-items', (req, res) => {
  try {
    const result = insertDodItem(db, Number(req.params.milestone_id), req.body || {})
    res.status(201).json(result)
  } catch (err) { _sendDodError(res, err) }
})

// PATCH /api/milestones/:milestone_id/dod-items/reorder
// MUSS vor PATCH /api/dod-items/:id deklariert werden (eindeutige Pfade — kein Konflikt, aber explizit).
app.patch('/api/milestones/:milestone_id/dod-items/reorder', (req, res) => {
  try {
    const items = reorderDodItems(db, Number(req.params.milestone_id), req.body?.order)
    res.json({ items })
  } catch (err) { _sendDodError(res, err) }
})

app.patch('/api/dod-items/:id', (req, res) => {
  try {
    res.json(patchDodItem(db, Number(req.params.id), req.body || {}))
  } catch (err) { _sendDodError(res, err) }
})

app.delete('/api/dod-items/:id', (req, res) => {
  try {
    deleteDodItem(db, Number(req.params.id))
    res.status(204).end()
  } catch (err) { _sendDodError(res, err) }
})

// PATCH /api/backlog/bulk — DD-36: Mehrfach-Operationen.
// MUSS vor /api/backlog/:id deklariert werden, sonst matched Express :id="bulk".
// Body: { ids: number[], action: 'set_status'|'set_sprint'|'cancel'|'soft_delete'|'add_tags'|'remove_tags',
//         payload: { status?, sprint_id?, tag_ids?, notes? } }
// Response: { ok: number[], failed: {id, reason}[] }
app.patch('/api/backlog/bulk', (req, res) => {
  const { ids, action, payload = {} } = req.body || {}
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' })
  if (!action) return res.status(400).json({ error: 'action required' })

  const ok = []
  const failed = []

  for (const rawId of ids) {
    const id = Number(rawId)
    try {
      const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(id)
      if (!item) { failed.push({ id, reason: 'not found' }); continue }

      if (action === 'set_status') {
        const newStatus = payload.status
        if (!newStatus) { failed.push({ id, reason: 'status required' }); continue }
        const ctx = {
          goal: item.goal, background: item.background,
          assigned_sprint: item.assigned_sprint,
          cancellationNotes: newStatus === 'cancelled' ? (payload.notes || 'bulk') : null,
          // T04b/G1 (D16): user_stories auch im Bulk-Pfad plumben, damit der
          // passed-Gate hier real erzwungen ist (nicht nur implizit via fehlendem
          // hasPassedReview). Grandfathering Q06: 0 Stories = vacuously erfüllt.
          userStories: listUserStories(db, id),
        }
        const { allowed, reason } = canTransition(item.status, newStatus, ctx)
        if (!allowed) { failed.push({ id, reason }); continue }
        const sets = ['status = ?']
        const vals = [newStatus]
        if (newStatus === 'completed' || newStatus === 'cancelled') sets.push('completed_at = CURRENT_TIMESTAMP')
        vals.push(id)
        db.prepare(`UPDATE backlog SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
        auditLog('backlog', id, 'status_change', { status: item.status }, { status: newStatus }, 'dashboard-bulk')
        ok.push(id)
      }
      else if (action === 'set_sprint') {
        const sprintId = payload.sprint_id
        if (item.status === 'in_progress') { failed.push({ id, reason: 'in_progress' }); continue }
        if (sprintId != null) {
          const sprint = db.prepare('SELECT id FROM sprints WHERE id = ?').get(sprintId)
          if (!sprint) { failed.push({ id, reason: 'sprint not found' }); continue }
          // T04b/G2 (D16): neue Sprint-Zuweisung nur bei >=1 User Story (Q06).
          const usCount = db.prepare('SELECT COUNT(*) AS n FROM user_stories WHERE backlog_id = ?').get(id).n
          const gate = canAssignSprint({ userStoryCount: usCount })
          if (!gate.allowed) { failed.push({ id, reason: gate.reason }); continue }
          db.prepare('UPDATE backlog SET assigned_sprint = ? WHERE id = ?').run(sprintId, id)
          if (item.status === 'refined') db.prepare("UPDATE backlog SET status='planned' WHERE id=?").run(id)
        } else {
          db.prepare('UPDATE backlog SET assigned_sprint = NULL WHERE id = ?').run(id)
          if (item.status === 'planned') db.prepare("UPDATE backlog SET status='refined' WHERE id=?").run(id)
        }
        syncBacklogMilestoneForItem(id)
        auditLog('backlog', id, 'sprint_assign', { assigned_sprint: item.assigned_sprint }, { assigned_sprint: sprintId }, 'dashboard-bulk')
        ok.push(id)
      }
      else if (action === 'cancel' || action === 'soft_delete') {
        // DD-524: Soft-Delete abgelöst durch cancelled-Status. 'soft_delete'
        // bleibt als Alias erhalten (Back-Compat), führt jetzt einen
        // lifecycle-validierten Cancel durch.
        if (item.status === 'cancelled') { failed.push({ id, reason: 'already cancelled' }); continue }
        const ctx = {
          goal: item.goal, background: item.background,
          assigned_sprint: item.assigned_sprint,
          cancellationNotes: payload.notes || 'bulk',
        }
        const { allowed, reason } = canTransition(item.status, 'cancelled', ctx)
        if (!allowed) { failed.push({ id, reason }); continue }
        db.prepare("UPDATE backlog SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(id)
        auditLog('backlog', id, 'status_change', { status: item.status }, { status: 'cancelled' }, 'dashboard-bulk')
        ok.push(id)
      }
      else if (action === 'add_tags') {
        const tagIds = payload.tag_ids || []
        for (const tagId of tagIds) {
          db.prepare('INSERT OR IGNORE INTO backlog_tags (backlog_id, tag_id) VALUES (?, ?)').run(id, tagId)
        }
        ok.push(id)
      }
      else if (action === 'remove_tags') {
        const tagIds = payload.tag_ids || []
        if (tagIds.length === 0) {
          db.prepare('DELETE FROM backlog_tags WHERE backlog_id = ?').run(id)
        } else {
          const placeholders = tagIds.map(() => '?').join(',')
          db.prepare(`DELETE FROM backlog_tags WHERE backlog_id = ? AND tag_id IN (${placeholders})`).run(id, ...tagIds)
        }
        ok.push(id)
      }
      else {
        failed.push({ id, reason: 'unknown action' })
      }
    } catch (e) {
      failed.push({ id, reason: e.message || 'error' })
    }
  }

  res.json({ ok, failed })
})

// DD-378: Zentrale, wiederverwendbare Anreicherung eines Backlog-Items über
// seine GLOBALE backlog.id. Liefert das voll angereicherte Objekt oder null
// (404). Beide Routen — GET /api/backlog/:id (Legacy-/CLI-Pfad) UND
// GET /api/projects/:pid/issues/by-number/:n (kanonisch) — rufen diesen Helper,
// damit die Degradations-Logik (DD-381) NICHT dupliziert wird.
function loadEnrichedBacklogItem(backlogId) {
  let item = db.prepare(`
    SELECT b.*, s.name as sprint_name, s.project_number as sprint_project_number, p.prefix as project_prefix
    FROM backlog b
    LEFT JOIN sprints s ON s.id = b.assigned_sprint
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.id = ?
  `).get(backlogId)
  if (!item) return null

  // DD-381: Der Core-Issue (oben) ist geladen — 404 bleibt das einzige
  // harte Fehlerverhalten. Jede optionale Anreicherung (Sub-Resource) wird
  // einzeln gekapselt: wirft eine Sub-Query (z.B. fehlende Tabelle), wird das
  // Feld zu []/null degradiert + eine Server-Warnung geloggt, statt einen
  // kompletten 500 zu produzieren. So bleibt der Issue stets darstellbar.
  const enrich = (label, fn, fallback) => {
    try {
      return fn()
    } catch (e) {
      console.warn(`[backlog/:id] sub-query "${label}" für #${backlogId} fehlgeschlagen, degradiert: ${e?.message || e}`)
      return fallback
    }
  }

  const tasks = enrich('tasks', () =>
    db.prepare('SELECT * FROM tasks WHERE backlog_id = ? ORDER BY id').all(backlogId), [])

  const feedback = enrich('feedback', () => {
    const rows = db.prepare('SELECT * FROM review_feedback WHERE backlog_id = ? ORDER BY created_at DESC').all(backlogId)
    for (const fb of rows) {
      try {
        fb.screenshots = db.prepare('SELECT * FROM review_screenshots WHERE feedback_id = ?').all(fb.id)
      } catch (e) {
        console.warn(`[backlog/:id] sub-query "feedback.screenshots" für feedback #${fb.id} fehlgeschlagen, degradiert: ${e?.message || e}`)
        fb.screenshots = []
      }
    }
    return rows
  }, [])

  const attachments = enrich('attachments', () =>
    db.prepare(
      'SELECT id, file_path, mime_type, caption, created_at FROM backlog_attachments WHERE backlog_id = ? ORDER BY id'
    ).all(backlogId), [])

  const tags = enrich('tags', () =>
    tagsForBacklog([Number(backlogId)]).get(Number(backlogId)) || [], [])

  // DD-129: files aus issue_files joinen.
  const files = enrich('files', () =>
    db.prepare(
      'SELECT id, path, position FROM issue_files WHERE issue_id = ? ORDER BY position, id'
    ).all(backlogId), [])

  if (item.project_prefix && item.project_number != null) {
    item.key = `${item.project_prefix}-${item.project_number}`
  }
  if (item.project_prefix && item.sprint_project_number != null) {
    item.sprint_key = `${item.project_prefix}#${item.sprint_project_number}`
  }
  const subtasks = enrich('subtasks', () => listSubtasks(db, backlogId), [])
  // E01.2: User Stories (Pruefgrundlage) je Issue mitliefern.
  const user_stories = enrich('user_stories', () => listUserStories(db, backlogId), [])
  // MEM-14: Issue-Abhängigkeiten mitliefern (blockers = worauf dieses Issue wartet).
  const dependencies = enrich('dependencies', () => listIssueDependencies(db, backlogId),
    { blockers: [], blocked_by: [] })

  return { ...item, tasks, subtasks, user_stories, feedback, attachments, tags, files, dependencies }
}

// DD-555: Lost-Issues-Finder — nicht-terminale Issues (status ∉ done/passed/cancelled),
// die einem COMPLETED Sprint zugeordnet sind. Beim Sprint-Abschluss zurückgebliebene
// Items (force-complete, nachträgliche Reopens, Umhängungen) werden sichtbar.
// Data-Hygiene-Query, projekt-scoped. MUSS vor /api/backlog/:id stehen (sonst :id="lost").
app.get('/api/backlog/lost', (req, res) => {
  const projectId = currentProjectId(req)
  const rows = db.prepare(`
    SELECT b.id, b.project_number, b.status, b.title,
           p.prefix AS project_prefix,
           s.id AS sprint_id, s.name AS sprint_name, s.status AS sprint_status,
           s.project_number AS sprint_project_number
    FROM backlog b
    JOIN sprints s ON s.id = b.assigned_sprint
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.project_id = ?
      AND b.deleted_at IS NULL
      AND s.status = 'completed'
      AND b.status NOT IN ('completed', 'passed', 'cancelled')
    ORDER BY s.id, b.project_number
  `).all(projectId)
  for (const r of rows) {
    if (r.project_prefix && r.project_number != null) r.key = `${r.project_prefix}-${r.project_number}`
    if (r.project_prefix && r.sprint_project_number != null) r.sprint_key = `${r.project_prefix}#${r.sprint_project_number}`
  }
  res.json(rows)
})

// Legacy-/CLI-Pfad: Auflösung über GLOBALE backlog.id. Bleibt unverändert
// erhalten (CLI-OSC8-Links, Bookmarks, interne Fetches, die backlog.id tragen).
app.get('/api/backlog/:id', (req, res) => {
  const enriched = loadEnrichedBacklogItem(req.params.id)
  if (!enriched) return res.status(404).json({ error: 'Item not found' })
  res.json(enriched)
})

// DD-378 (D04 completion): Kanonische Auflösung eines Issues über die
// pro-Projekt fortlaufende `project_number`. `/devd/issues/348` →
// project_number 348 im Projekt devd, nicht globale backlog-Zeile 348.
//
// Dual-Resolution (rückwärtskompatibel, siehe lib/issueResolve.js):
//   1. zuerst als project_number im :pid-Projekt,
//   2. sonst als globale backlog.id (Legacy-Fallback), beides projekt-gescopet.
// Response-Shape ist IDENTISCH zu GET /api/backlog/:id (gleicher Helper).
// `resolved_via` signalisiert dem Frontend, ob ein Legacy-id-Segment getroffen
// wurde → ItemDetail kann die URL auf die kanonische project_number normalisieren.
app.get('/api/projects/:pid/issues/by-number/:n', (req, res) => {
  const projectId = Number(req.params.pid)
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return res.status(400).json({ error: 'Invalid project id' })
  }
  const resolution = resolveIssueByNumber(db, projectId, req.params.n)
  if (!resolution) return res.status(404).json({ error: 'Item not found' })

  const enriched = loadEnrichedBacklogItem(resolution.id)
  if (!enriched) return res.status(404).json({ error: 'Item not found' })

  res.json({ ...enriched, resolved_via: resolution.via })
})

function sendSubtaskError(res, err) {
  if (err instanceof SubtaskValidationError) {
    return res.status(err.status).json({ error: err.message })
  }
  throw err
}

app.get('/api/backlog/:id/subtasks', (req, res) => {
  const parent = db.prepare('SELECT id FROM backlog WHERE id = ?').get(req.params.id)
  if (!parent) return res.status(404).json({ error: 'Backlog item not found' })
  res.json(listSubtasks(db, req.params.id))
})

app.post('/api/backlog/:id/subtasks', (req, res, next) => {
  try {
    const subtask = createSubtask(db, req.params.id, req.body || {})
    res.status(201).json(subtask)
  } catch (err) {
    try { return sendSubtaskError(res, err) } catch (e) { return next(e) }
  }
})

app.patch('/api/subtasks/:id', (req, res, next) => {
  try {
    res.json(updateSubtask(db, req.params.id, req.body || {}))
  } catch (err) {
    try { return sendSubtaskError(res, err) } catch (e) { return next(e) }
  }
})

app.patch('/api/subtasks/:id/status', (req, res, next) => {
  try {
    if (!req.body || !req.body.status) return res.status(400).json({ error: 'status ist Pflichtfeld' })
    res.json(setSubtaskStatus(db, req.params.id, req.body.status))
  } catch (err) {
    try { return sendSubtaskError(res, err) } catch (e) { return next(e) }
  }
})

app.delete('/api/subtasks/:id', (req, res, next) => {
  try {
    res.json(deleteSubtask(db, req.params.id))
  } catch (err) {
    try { return sendSubtaskError(res, err) } catch (e) { return next(e) }
  }
})

// DD-45 R04: Batch-Reorder fuer Sub-Tasks. Body: { ids: [<sub_id>, ...] }.
// Setzt Positionen normalisiert (10, 20, 30, ...). Garantiert stabile
// Reihenfolge nach Reload und vermeidet Positionskollisionen.
app.put('/api/backlog/:id/subtasks/order', (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null
    if (!ids) return res.status(400).json({ error: 'ids muss Array sein' })
    res.json(reorderSubtasks(db, req.params.id, ids))
  } catch (err) {
    try { return sendSubtaskError(res, err) } catch (e) { return next(e) }
  }
})

// ---- User Stories (E01.2, GF-2 Backend-Epic) — Pruefgrundlage je Issue. ----
// Mirrors subtask routes. us_verdict {open,accepted,rejected} (Backend-B02). qa = D09.
function sendUserStoryError(res, err) {
  if (err instanceof UserStoryValidationError) {
    return res.status(err.status).json({ error: err.message })
  }
  throw err
}

app.get('/api/backlog/:id/user-stories', (req, res) => {
  const parent = db.prepare('SELECT id FROM backlog WHERE id = ?').get(req.params.id)
  if (!parent) return res.status(404).json({ error: 'Backlog item not found' })
  res.json(listUserStories(db, req.params.id))
})

app.post('/api/backlog/:id/user-stories', (req, res, next) => {
  try {
    res.status(201).json(createUserStory(db, req.params.id, req.body || {}))
  } catch (err) {
    try { return sendUserStoryError(res, err) } catch (e) { return next(e) }
  }
})

app.patch('/api/user-stories/:id', (req, res, next) => {
  try {
    res.json(updateUserStory(db, req.params.id, req.body || {}))
  } catch (err) {
    try { return sendUserStoryError(res, err) } catch (e) { return next(e) }
  }
})

app.patch('/api/user-stories/:id/verdict', (req, res, next) => {
  try {
    if (!req.body || !req.body.us_verdict) return res.status(400).json({ error: 'us_verdict ist Pflichtfeld' })
    res.json(setUserStoryVerdict(db, req.params.id, req.body.us_verdict))
  } catch (err) {
    try { return sendUserStoryError(res, err) } catch (e) { return next(e) }
  }
})

app.delete('/api/user-stories/:id', (req, res, next) => {
  try {
    res.json(deleteUserStory(db, req.params.id))
  } catch (err) {
    try { return sendUserStoryError(res, err) } catch (e) { return next(e) }
  }
})

// Update PO notes (DD-129: po_notes als separate Spalte).
app.patch('/api/backlog/:id', (req, res) => {
  const { notes, po_notes } = req.body
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const value = po_notes !== undefined ? po_notes : notes
  if (value !== undefined) {
    db.prepare('UPDATE backlog SET po_notes = ? WHERE id = ?').run(value, req.params.id)
  }
  const updated = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// --- Screenshots ---
app.post('/api/review/:id/screenshots', upload.array('files', 10), (req, res) => {
  const feedbackId = req.params.id
  const insert = db.prepare('INSERT INTO review_screenshots (feedback_id, file_path, caption) VALUES (?, ?, ?)')

  const screenshots = []
  for (const file of req.files) {
    const result = insert.run(feedbackId, file.filename, null)
    screenshots.push({ id: result.lastInsertRowid, file_path: file.filename })
  }
  res.json(screenshots)
})

app.delete('/api/screenshots/:id', (req, res) => {
  db.prepare('DELETE FROM review_screenshots WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// --- Backlog Attachments (DD-17 / DD-65) ---
app.post('/api/backlog/:id/attachments', upload.array('files', 10), (req, res) => {
  const backlogId = Number(req.params.id)
  const item = db.prepare('SELECT id FROM backlog WHERE id = ?').get(backlogId)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  // DD-65: MIME-Validierung — nur Bilder akzeptiert.
  const invalid = (req.files || []).filter(f => !(f.mimetype || '').startsWith('image/'))
  if (invalid.length > 0) {
    for (const f of req.files || []) {
      try { unlinkSync(resolve(UPLOADS_DIR, f.filename)) } catch {}
    }
    return res.status(422).json({
      error: 'Nur Bild-Dateien erlaubt',
      rejected: invalid.map(f => ({ filename: f.originalname, mime_type: f.mimetype })),
    })
  }
  const insert = db.prepare(
    'INSERT INTO backlog_attachments (backlog_id, file_path, mime_type, caption) VALUES (?, ?, ?, ?)'
  )
  const attachments = []
  for (const file of req.files || []) {
    const r = insert.run(backlogId, file.filename, file.mimetype || null, null)
    attachments.push({
      id: r.lastInsertRowid,
      file_path: file.filename,
      mime_type: file.mimetype || null,
    })
  }
  res.status(201).json(attachments)
})

// --- Sub-Tasks (DD-22) ---
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done']

app.post('/api/backlog/:id/tasks', (req, res) => {
  const backlogId = Number(req.params.id)
  const item = db.prepare('SELECT id FROM backlog WHERE id = ?').get(backlogId)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const title = String(req.body?.title || '').trim()
  if (!title) return res.status(422).json({ error: 'title pflicht' })
  const effort = req.body?.effort != null ? Number(req.body.effort) : null
  const r = db.prepare(
    'INSERT INTO tasks (backlog_id, title, effort, status) VALUES (?, ?, ?, ?)'
  ).run(backlogId, title, Number.isFinite(effort) ? effort : null, 'todo')
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid)
  res.status(201).json(row)
})

app.put('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Task not found' })
  const updates = []
  const values = []
  if (req.body?.title !== undefined) {
    const t = String(req.body.title).trim()
    if (!t) return res.status(422).json({ error: 'title leer' })
    updates.push('title = ?'); values.push(t)
  }
  if (req.body?.status !== undefined) {
    if (!TASK_STATUSES.includes(req.body.status)) return res.status(422).json({ error: 'ungueltiger status' })
    updates.push('status = ?'); values.push(req.body.status)
    if (req.body.status === 'done' && !row.completed_at) {
      updates.push('completed_at = datetime(\'now\')')
    }
  }
  if (req.body?.effort !== undefined) {
    const e = Number(req.body.effort)
    updates.push('effort = ?'); values.push(Number.isFinite(e) ? e : null)
  }
  if (!updates.length) return res.json(row)
  values.push(id)
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  res.json(updated)
})

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Task not found' })
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  res.json({ ok: true })
})

app.delete('/api/attachments/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM backlog_attachments WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Attachment not found' })
  db.prepare('DELETE FROM backlog_attachments WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ============================================================
// PHASE 2 — New Endpoints
// ============================================================

// Helper: write to audit_log using actual schema
function auditLog(tableNameVal, recordId, action, oldValue, newValue, changedBy) {
  try {
    db.prepare(
      `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, agent_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(tableNameVal, recordId, action, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, changedBy)
  } catch (_) {
    // audit_log failures must never break the main request
  }
}

// ---- Issues (Backlog) ----


// DD-129: replace files-Liste in issue_files (DELETE+INSERT, transactional).
function syncIssueFiles(issueId, files) {
  if (!Array.isArray(files)) return
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM issue_files WHERE issue_id = ?').run(issueId)
    const ins = db.prepare('INSERT INTO issue_files (issue_id, path, position) VALUES (?, ?, ?)')
    files.forEach((entry, idx) => {
      const pathStr = typeof entry === 'string' ? entry : entry?.path
      if (!pathStr || !String(pathStr).trim()) return
      ins.run(issueId, String(pathStr).trim(), idx)
    })
  })
  tx()
}

// ============================================================
// DD-222: POST /api/issues — Public PWA-Capture endpoint.
// Single-multipart request: required project_id + title; optional
// description + photo. Multer runs FIRST so req.body is populated for
// the validator. Magic-byte verify after multer. Atomic-style — if
// anything fails, delete the temp upload + return error code.
// ============================================================
app.post(
  '/api/issues',
  issuesCaptureLimiter,
  apiKeyAuth,
  pwaUpload.single('photo'),
  // express-validator chain — runs after multer parses multipart.
  body('project_id').isInt({ min: 1 }).withMessage('project_id must be a positive integer').toInt(),
  body('title').isString().isLength({ min: 3, max: 200 }).withMessage('title must be 3-200 chars'),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 5000 }).withMessage('description max 5000 chars'),
  // DD-270: optional Type-Selector im Catcher (bug/feature/improvement/core). Default feature.
  body('type').optional({ checkFalsy: true }).isIn(['bug', 'feature', 'improvement', 'core']).withMessage('type must be one of bug|feature|improvement|core'),
  async (req, res, next) => {
    const tmpPath = req.file ? path.join(PWA_TMP_DIR, req.file.filename) : null
    const cleanupTmp = () => { if (tmpPath) { try { unlinkSync(tmpPath) } catch {} } }

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      cleanupTmp()
      return res.status(422).json({ error: 'VALIDATION_FAILED', details: errors.array() })
    }

    const { project_id, title } = req.body
    // DD-270: type default = 'feature' (BC zu DD-222 vor Pre-Cutover).
    const issueType = req.body.type || 'feature'
    // DD-456 fix: das Catcher-„Details"-Feld kommt als `description` rein und
    // landet in po_notes (= „PO-Notizen" im Issue-Detail). Vorher validiert,
    // aber nie persistiert → stiller Datenverlust (SPF-59/62/64/67).
    // DD2-131: `description` ist projektweit abgelöst (po_notes ist der einzige
    // Issue-Freitext); hier bleibt es BEWUSST als reiner Capture-Wire-Alias der
    // PWA stehen — es wird nicht in die (gedroppte) backlog.description-Spalte
    // geschrieben, sondern ausschließlich nach po_notes gemappt.
    const poNotes = (typeof req.body.description === 'string' && req.body.description.trim())
      ? req.body.description.trim()
      : null

    // FK-existence check (also blocks enumeration of non-archived projects).
    const project = db.prepare('SELECT id, prefix, archived, public_capture FROM projects WHERE id = ?').get(project_id)
    if (!project || project.archived) {
      cleanupTmp()
      return res.status(422).json({ error: 'PROJECT_NOT_FOUND' })
    }

    // DD-392: on the public capture host (issues.*), only projects explicitly
    // flagged public_capture=1 accept issue creation. A troll who knows the host
    // can therefore not POST into private projects. Other hosts (devdash.* behind
    // Authelia, localhost) are unaffected — authenticated users capture anywhere.
    const onCaptureHost = hostIsCaptureHost(req.hostname || req.headers.host, CAPTURE_HOST)
    if (onCaptureHost && !project.public_capture) {
      cleanupTmp()
      return res.status(403).json({ error: 'PROJECT_NOT_PUBLIC' })
    }

    // DD-393: abuse backstops for the public capture path (defense-in-depth behind
    // the Cloudflare edge + per-client rate-limit). Per-project + global daily caps
    // on anonymous captures bound how many issues a troll can create; the tighter
    // image-size limit keeps mass uploads from filling the NAS disk. Owner/Julia
    // captures on devdash.* (authenticated → not onCaptureHost) are unaffected.
    if (onCaptureHost) {
      if (req.file && req.file.size > PUBLIC_CAPTURE_MAX_FILE_BYTES) {
        cleanupTmp()
        return res.status(413).json({ error: 'FILE_TOO_LARGE', max_bytes: PUBLIC_CAPTURE_MAX_FILE_BYTES })
      }
      const projectCount = db.prepare(`
        SELECT COUNT(*) AS c FROM backlog
        WHERE project_id = ? AND created_by_user IS NULL AND status != 'cancelled'
          AND created_at >= datetime('now', 'start of day')
      `).get(project.id).c
      const globalCount = db.prepare(`
        SELECT COUNT(*) AS c FROM backlog
        WHERE created_by_user IS NULL AND status != 'cancelled'
          AND created_at >= datetime('now', 'start of day')
      `).get().c
      const rejection = captureCapRejection({ projectCount, globalCount })
      if (rejection) {
        cleanupTmp()
        return res.status(429).json({ error: rejection.code, cap: rejection.cap })
      }
    }

    // If a photo was attached, verify magic bytes before persisting anything.
    if (req.file) {
      const v = await verifyImageMagicBytes(tmpPath, req.file.mimetype)
      if (!v.ok) {
        cleanupTmp()
        return res.status(415).json({ error: 'MAGIC_BYTE_VERIFY_FAILED', reason: v.reason })
      }
    }

    // Insert backlog row + (optional) attachment row in a single transaction.
    const createdBy = (req.user && req.user.username) ? req.user.username : null
    const insertTx = db.transaction(() => {
      const max = db.prepare('SELECT MAX(project_number) as mx FROM backlog WHERE project_id = ?').get(project.id)
      const projectNumber = (max?.mx ?? 0) + 1
      const r = db.prepare(`
        INSERT INTO backlog (project_id, project_number, title, type, status, created_by_user, po_notes)
        VALUES (?, ?, ?, ?, 'new', ?, ?)
      `).run(project.id, projectNumber, title, issueType, createdBy, poNotes)
      const newId = r.lastInsertRowid

      if (req.file) {
        // Move from os.tmpdir → UPLOADS_DIR. rename works if same FS; fall back to copy+unlink.
        const finalPath = path.join(UPLOADS_DIR, req.file.filename)
        try {
          renameSync(tmpPath, finalPath)
        } catch (e) {
          if (e.code === 'EXDEV') {
            copyFileSync(tmpPath, finalPath)
            unlinkSync(tmpPath)
          } else {
            throw e
          }
        }
        db.prepare(
          'INSERT INTO backlog_attachments (backlog_id, file_path, mime_type, caption) VALUES (?, ?, ?, ?)'
        ).run(newId, req.file.filename, req.file.mimetype || null, null)
      }
      return { newId, projectNumber }
    })

    let newId, projectNumber
    try {
      ({ newId, projectNumber } = insertTx())
    } catch (e) {
      cleanupTmp()
      return next(e)
    }

    const key = project.prefix ? `${project.prefix}-${projectNumber}` : null
    auditLog('backlog', newId, 'create', null, { source: 'pwa-capture', created_by: createdBy }, createdBy || 'pwa-capture')
    res.status(201).location(`/api/issues/${newId}`).json({ id: newId, key })
  },
  // Multer-error handler for this route (415, 413, etc.)
  (err, req, res, next) => pwaMulterErrorHandler(err, res, next),
)

// POST /api/backlog — Create issue
app.post('/api/backlog', (req, res) => {
  // DD-560: Struktur-Validierung (title/type/priority/create-status) via Zod-Contract.
  // Business-Regeln (refined→goal+background, Sprint-Auto-Status) bleiben unten.
  const parsed = issueCreateContract.safeParse(req.body || {})
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const { title, type, priority, milestone, status, plugin_key, goal, background, context_notes, relevant_files, po_notes, files, tag_ids, assigned_sprint, sprint_id } = req.body

  let finalStatus = 'new'
  if (status === 'refined') {
    if (!goal || !background) return res.status(400).json({ error: 'goal und background erforderlich für status refined' })
    finalStatus = 'refined'
  }

  const projectId = currentProjectId(req)

  // Sprint-Zuweisung beim Anlegen — akzeptiere `assigned_sprint` (DB-Spalte) ODER
  // `sprint_id` (analog PATCH /sprint Body-Key, siehe ADR MCP Tools 2026-05-07).
  // Auto-Status-Side-Effect spiegelt PATCH /sprint: new/refined → planned.
  const sprintInput = assigned_sprint ?? sprint_id ?? null
  let sprintIdResolved = null
  if (sprintInput !== null && sprintInput !== undefined) {
    const sprint = db.prepare('SELECT id, project_id FROM sprints WHERE id = ?').get(sprintInput)
    if (!sprint) return res.status(422).json({ error: 'Sprint not found' })
    if (sprint.project_id !== projectId) return res.status(422).json({ error: 'Sprint gehört nicht zum aktiven Projekt' })
    sprintIdResolved = sprint.id
    if (finalStatus === 'new' || finalStatus === 'refined') {
      finalStatus = 'planned'
    }
  }

  // refined_at wird gesetzt, sobald das Issue über `new` hinaus ist.
  const setRefinedAt = finalStatus === 'refined' || finalStatus === 'planned'

  const insertWithNumber = db.transaction(() => {
    const max = db.prepare('SELECT MAX(project_number) as mx FROM backlog WHERE project_id = ?').get(projectId)
    const projectNumber = (max?.mx ?? 0) + 1
    const r = db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, type, priority, milestone, status, plugin_key, goal, background, context_notes, relevant_files, po_notes, assigned_sprint, refined_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
    `).run(
      projectId, projectNumber, title, type, priority || 3, milestone || null,
      finalStatus, plugin_key || null, goal || null, background || null, context_notes || null,
      relevant_files || null, po_notes || null, sprintIdResolved,
      setRefinedAt ? 1 : 0,
    )
    return r.lastInsertRowid
  })
  const newId = insertWithNumber()

  // DD-129: files-Array in issue_files schreiben.
  if (Array.isArray(files) && files.length) syncIssueFiles(newId, files)

  // Optionale Tag-Zuweisung beim Anlegen.
  if (Array.isArray(tag_ids) && tag_ids.length) {
    const valid = db.prepare(`SELECT id FROM tags WHERE project_id = ? AND id IN (${tag_ids.map(() => '?').join(',')})`)
      .all(projectId, ...tag_ids)
    const ins = db.prepare('INSERT OR IGNORE INTO backlog_tags (backlog_id, tag_id) VALUES (?, ?)')
    for (const t of valid) ins.run(newId, t.id)
  }

  // Bei Sprint-Zuweisung: Milestone synchron mit dem Sprint setzen.
  if (sprintIdResolved !== null) {
    syncBacklogMilestoneForItem(newId)
  }

  const item = db.prepare(`
    SELECT b.*, p.prefix as project_prefix
    FROM backlog b LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.id = ?
  `).get(newId)
  item.tags = tagsForBacklog([newId]).get(newId) || []
  item.files = db.prepare('SELECT id, path, position FROM issue_files WHERE issue_id = ? ORDER BY position, id').all(newId)
  if (item.project_prefix && item.project_number != null) {
    item.key = `${item.project_prefix}-${item.project_number}`
  }
  auditLog('backlog', newId, 'create', null, item, 'dashboard-po')
  res.status(201).json(item)
})

// PUT /api/backlog/:id — Edit issue fields (not status or sprint)
app.put('/api/backlog/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const body = req.body || {}
  try {
    applyBacklogUpdate(db, req.params.id, body)
  } catch (err) {
    if (err instanceof BacklogUpdateError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  // DD-129: files-Array (issue_files) komplett ersetzen, nur wenn explizit übergeben.
  if (Array.isArray(body.files)) syncIssueFiles(Number(req.params.id), body.files)
  const updated = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  updated.files = db.prepare('SELECT id, path, position FROM issue_files WHERE issue_id = ? ORDER BY position, id').all(req.params.id)
  res.json(updated)
})

// PATCH /api/backlog/:id/status — Status transition
app.patch('/api/backlog/:id/status', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const { status: newStatus, notes } = req.body
  if (!newStatus) return res.status(400).json({ error: 'status ist Pflichtfeld' })

  // Build ctx for lifecycle check
  const latestFeedback = db.prepare(
    'SELECT * FROM review_feedback WHERE backlog_id = ? ORDER BY id DESC LIMIT 1'
  ).get(req.params.id)

  // DD-41: WIP-Limit pruefen, falls Sprint zugewiesen.
  let sprintWipLimit = null
  let sprintInProgressCount = null
  if (item.assigned_sprint) {
    const sprintRow = db.prepare('SELECT wip_limit FROM sprints WHERE id = ?').get(item.assigned_sprint)
    sprintWipLimit = sprintRow?.wip_limit ?? null
    if (sprintWipLimit != null) {
      const cnt = db.prepare(
        'SELECT COUNT(*) AS n FROM backlog WHERE assigned_sprint = ? AND status = ?'
      ).get(item.assigned_sprint, 'in_progress')
      sprintInProgressCount = cnt.n
    }
  }

  const ctx = {
    goal: item.goal,
    background: item.background,
    assigned_sprint: item.assigned_sprint,
    hasPassedReview: latestFeedback?.review_status === 'passed',
    hasRejectedReview: latestFeedback?.review_status === 'not_passed',
    cancellationNotes: newStatus === 'cancelled' ? notes : null,
    sprintWipLimit,
    sprintInProgressCount,
    isSystemTransition: false,
    // T04b/G1 (D15): `passed` verlangt, dass alle User Stories abgenommen sind.
    // Grandfathering (Q06): Issues ohne User Stories bleiben vacuously erfüllt.
    userStories: listUserStories(db, req.params.id),
  }

  const { allowed, reason } = canTransition(item.status, newStatus, ctx)
  if (!allowed) return res.status(422).json({ error: reason })

  const sets = ['status = ?']
  const vals = [newStatus]

  if (newStatus === 'refined' && (item.status === 'new')) {
    sets.push('refined_at = CURRENT_TIMESTAMP')
  }
  if (newStatus === 'completed' || newStatus === 'cancelled') {
    sets.push('completed_at = CURRENT_TIMESTAMP')
  }
  if ((item.status === 'completed' && newStatus === 'planned') || (item.status === 'passed' && newStatus === 'planned')) {
    sets.push('completed_at = NULL')
  }

  vals.push(req.params.id)
  db.prepare(`UPDATE backlog SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  auditLog('backlog', Number(req.params.id), 'status_change', { status: item.status }, { status: newStatus, notes }, 'dashboard-po')

  // DD-507: Rework → to_review mit letztem Verdict not_passed öffnet automatisch
  // eine neue pending-Runde und setzt den Sprint-Review-Marker zurück (reopen).
  // Direkter DB-Write (eigene Transaktion in der Lib) — NICHT durch das
  // Review-Edit-Gate geroutet.
  maybeAutoOpenReworkRound(db, Number(req.params.id), newStatus, auditLog)

  const updated = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// PATCH /api/backlog/:id/sprint — Assign or remove sprint
app.patch('/api/backlog/:id/sprint', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  if (item.status === 'in_progress') {
    return res.status(409).json({ error: 'Issue ist in Bearbeitung' })
  }

  const { sprint_id } = req.body

  // T04b/G2 (D16): Neue Sprint-Zuweisung nur bei >=1 User Story (Grandfathering Q06:
  // greift nur auf NEUE Zuweisung, Unassign sprint_id==null bleibt frei).
  if (sprint_id != null) {
    const usCount = db.prepare('SELECT COUNT(*) AS n FROM user_stories WHERE backlog_id = ?').get(req.params.id).n
    const gate = canAssignSprint({ userStoryCount: usCount })
    if (!gate.allowed) return res.status(422).json({ error: gate.reason })
  }

  const assignSprint = db.transaction(() => {
    if (sprint_id != null) {
      const sprint = db.prepare('SELECT id FROM sprints WHERE id = ?').get(sprint_id)
      if (!sprint) throw new Error('Sprint not found')
      db.prepare('UPDATE backlog SET assigned_sprint = ? WHERE id = ?').run(sprint_id, req.params.id)
      // DD-146 R2: Sprint-Zuweisung setzt status auto auf 'planned' (auch von 'new').
      // refined_at als Audit-Marker setzen, falls noch null.
      if (item.status === 'new' || item.status === 'refined') {
        db.prepare("UPDATE backlog SET status = 'planned', refined_at = COALESCE(refined_at, CURRENT_TIMESTAMP) WHERE id = ?").run(req.params.id)
      }
    } else {
      db.prepare('UPDATE backlog SET assigned_sprint = NULL WHERE id = ?').run(req.params.id)
      if (item.status === 'planned') {
        db.prepare("UPDATE backlog SET status = 'refined' WHERE id = ?").run(req.params.id)
      }
    }
  })

  try {
    assignSprint()
  } catch (e) {
    return res.status(404).json({ error: e.message })
  }

  // Auto-Sync backlog.milestone aus dem (neuen) Sprint
  syncBacklogMilestoneForItem(Number(req.params.id))

  const updated = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// DELETE /api/backlog/:id — Hard-Delete (?force=1) ODER abgelehnt (409).
//
// DD-524: Soft-Delete (deleted_at) ist abgelöst durch den einheitlichen
// cancelled-Status. Ein DELETE ohne ?force=1 führt KEIN stilles Soft- oder
// Hard-Delete mehr aus, sondern liefert 409 und verweist auf den Cancel-Pfad
// (PATCH …/status → cancelled). Hartes, endgültiges Löschen bleibt via
// ?force=1 verfügbar.
app.delete('/api/backlog/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const force = req.query.force === '1' || req.query.force === 'true'

  if (force) {
    const doDelete = db.transaction(() => {
      db.prepare('DELETE FROM issue_dependencies WHERE issue_id = ? OR depends_on_id = ?').run(req.params.id, req.params.id)
      db.prepare('DELETE FROM review_feedback WHERE backlog_id = ?').run(req.params.id)
      db.prepare('DELETE FROM backlog WHERE id = ?').run(req.params.id)
    })
    doDelete()
    auditLog('backlog', Number(req.params.id), 'delete', item, null, 'dashboard-po')
    return res.status(204).end()
  }

  return res.status(409).json({
    error: 'USE_CANCEL_STATUS',
    message: 'Issues werden nicht mehr soft-deleted. Setze den Status auf "cancelled" (PATCH /api/backlog/:id/status), oder nutze ?force=1 zum endgültigen Löschen.',
  })
})

// DD-113: POST /api/backlog/:id/move — Issue in anderes Projekt verschieben.
// Body: { target_project_id: number }
// - setzt project_id, lässt assigned_sprint los, vergibt neue project_number
// - lehnt ab: in_progress, to_review, deleted
app.post('/api/backlog/:id/move', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  if (item.status === 'in_progress' || item.status === 'to_review') {
    return res.status(409).json({ error: 'Issue ist in Bearbeitung — vorher Status zurücksetzen' })
  }
  const target = Number(req.body?.target_project_id)
  if (!Number.isFinite(target) || target <= 0) return res.status(400).json({ error: 'target_project_id required' })
  if (target === item.project_id) return res.status(400).json({ error: 'Issue ist bereits in Zielprojekt' })

  const project = db.prepare('SELECT id, prefix FROM projects WHERE id = ? AND archived = 0').get(target)
  if (!project) return res.status(404).json({ error: 'Zielprojekt nicht gefunden' })

  const move = db.transaction(() => {
    const max = db.prepare('SELECT MAX(project_number) as mx FROM backlog WHERE project_id = ?').get(target)
    const nextNum = (max?.mx ?? 0) + 1
    db.prepare(`
      UPDATE backlog
      SET project_id = ?, project_number = ?, assigned_sprint = NULL, milestone = NULL
      WHERE id = ?
    `).run(target, nextNum, item.id)
    return nextNum
  })
  let newNumber
  try {
    newNumber = move()
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
  auditLog('backlog', item.id, 'move',
    { project_id: item.project_id, project_number: item.project_number, assigned_sprint: item.assigned_sprint },
    { project_id: target, project_number: newNumber, assigned_sprint: null }, 'dashboard-po')

  const updated = db.prepare(`
    SELECT b.*, p.prefix as project_prefix
    FROM backlog b LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.id = ?
  `).get(item.id)
  res.json(updated)
})

// DD-524: POST /api/backlog/:id/restore entfernt. Wiederherstellung erfolgt
// jetzt über die Lifecycle-Transition cancelled → refined (PATCH …/status).

// ---- Dependencies ----

// GET /api/backlog/:id/activity — audit_log fuer ein Backlog-Item
app.get('/api/backlog/:id/activity', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' })
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100))
  const rows = db.prepare(`
    SELECT id, timestamp, agent_id, action, old_value, new_value
    FROM audit_log
    WHERE table_name = 'backlog' AND record_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(id, limit)
  res.json(rows)
})

// GET /api/backlog/:id/dependencies
app.get('/api/backlog/:id/dependencies', (req, res) => {
  // MEM-14: geteilte Helper-Logik (auch von issue_show genutzt).
  res.json(listIssueDependencies(db, req.params.id))
})

// POST /api/backlog/:id/dependencies
app.post('/api/backlog/:id/dependencies', (req, res) => {
  const issueId = Number(req.params.id)
  const dependsOnId = Number(req.body?.depends_on_id)
  const { note } = req.body || {}
  if (!dependsOnId) return res.status(400).json({ error: 'depends_on_id ist Pflichtfeld' })
  if (issueId === dependsOnId) return res.status(400).json({ error: 'Self-Reference nicht erlaubt' })

  const existing = db.prepare(
    'SELECT id FROM issue_dependencies WHERE issue_id = ? AND depends_on_id = ?'
  ).get(issueId, dependsOnId)
  if (existing) return res.status(409).json({ error: 'Dependency existiert bereits' })

  // DD-40: Zyklus-Schutz. Wir setzen die Edge issueId → dependsOnId
  // (issueId 'depends on' dependsOnId, also dependsOnId muss zuerst fertig sein).
  // Zyklus = es existiert bereits ein Pfad dependsOnId → ... → issueId
  // (denn dann waere nach dem Insert dependsOnId → issueId → dependsOnId).
  const allEdges = db.prepare('SELECT issue_id, depends_on_id FROM issue_dependencies').all()
  const adj = new Map() // from → [to]
  for (const e of allEdges) {
    if (!adj.has(e.issue_id)) adj.set(e.issue_id, [])
    adj.get(e.issue_id).push(e.depends_on_id)
  }
  const reaches = (start, target) => {
    const stack = [start]
    const visited = new Set()
    while (stack.length) {
      const cur = stack.pop()
      if (cur === target) return true
      if (visited.has(cur)) continue
      visited.add(cur)
      const out = adj.get(cur) || []
      for (const nxt of out) stack.push(nxt)
    }
    return false
  }
  if (reaches(dependsOnId, issueId)) {
    return res.status(422).json({ error: 'Zyklus erkannt: dependsOnId hat bereits einen Pfad zu issueId' })
  }

  const result = db.prepare(
    'INSERT INTO issue_dependencies (issue_id, depends_on_id, note) VALUES (?, ?, ?)'
  ).run(issueId, dependsOnId, note || null)

  const dep = db.prepare('SELECT * FROM issue_dependencies WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(dep)
})

// GET /api/dependencies/graph — DD-40: Adjacency-Repraesentation fuer Visualisierung.
// Optional ?sprint_id=X scoped auf einen Sprint, sonst projektweit.
app.get('/api/dependencies/graph', (req, res) => {
  const projectId = currentProjectId(req)
  const sprintId = req.query.sprint_id ? Number(req.query.sprint_id) : null
  const params = [projectId]
  let where = 'b.project_id = ?'
  if (sprintId) { where += ' AND b.assigned_sprint = ?'; params.push(sprintId) }

  const items = db.prepare(`
    SELECT b.id, b.project_number, b.title, b.status, b.type, b.priority, p.prefix AS project_prefix
    FROM backlog b
    JOIN projects p ON p.id = b.project_id
    WHERE ${where}
  `).all(...params)
  const itemIds = new Set(items.map(i => i.id))

  // DD-70: Edges via JOIN auf backlog.project_id eindämmen — nur Dependencies
  // zwischen Items des aktuellen Projekts laufen ein, niemals Cross-Projekt.
  const edges = db.prepare(`
    SELECT d.id, d.issue_id AS "from", d.depends_on_id AS "to", d.note
    FROM issue_dependencies d
    JOIN backlog a ON a.id = d.issue_id AND a.project_id = ?
    JOIN backlog b ON b.id = d.depends_on_id AND b.project_id = ?
  `).all(projectId, projectId).filter(e => itemIds.has(e.from) && itemIds.has(e.to))

  // Nur Items, die an mindestens einer Edge beteiligt sind (sonst zu viele isolierte Knoten)
  const involved = new Set()
  for (const e of edges) { involved.add(e.from); involved.add(e.to) }
  const nodes = items.filter(i => involved.has(i.id))

  res.json({ nodes, edges })
})

// DELETE /api/dependencies/:id
app.delete('/api/dependencies/:id', (req, res) => {
  db.prepare('DELETE FROM issue_dependencies WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// ---- Sprints (new endpoints) ----

// POST /api/sprints — Create sprint
app.post('/api/sprints', (req, res) => {
  // DD-561: Struktur-Validierung (name Pflicht) via Zod-Contract. Business-Regeln
  // (milestone-project-match, DD-173 completed-Guard) bleiben unten.
  const parsed = sprintCreateContract.safeParse(req.body || {})
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const { name, start_date, end_date, capacity, notes, goal, milestone_id, wip_limit } = req.body

  const projectId = currentProjectId(req)
  // DD-67: Milestone muss zum gleichen Projekt gehören.
  // DD-173/DD-306: Abgeschlossene Milestones (status=completed nach Migration 038) akzeptieren keine Sprints mehr.
  if (milestone_id != null && milestone_id !== '') {
    const ms = db.prepare('SELECT project_id, status FROM milestones WHERE id = ?').get(milestone_id)
    if (!ms || ms.project_id !== projectId) {
      return res.status(400).json({ error: 'milestone_id gehört nicht zum aktuellen Projekt' })
    }
    if (ms.status === 'completed') {
      return res.status(422).json({ error: 'Milestone ist abgeschlossen — keine weiteren Sprints zuweisbar' })
    }
  }
  // DD-92: project_number + position pro Projekt fortlaufend in Transaktion vergeben.
  const insertTx = db.transaction(() => {
    const maxPos = db.prepare('SELECT MAX(position) as mp FROM sprints WHERE project_id = ?').get(projectId)
    const position = (maxPos?.mp ?? -1) + 1
    const maxNum = db.prepare('SELECT MAX(project_number) as mn FROM sprints WHERE project_id = ?').get(projectId)
    const projectNumber = (maxNum?.mn ?? 0) + 1
    return db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, start_date, end_date, capacity, notes, goal, status, position, milestone_id, wip_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `).run(projectId, projectNumber, name, start_date || null, end_date || null, capacity || null, notes || null, goal || null, position, milestone_id || null, wip_limit || null)
  })
  const result = insertTx()

  const sprint = db.prepare(`
    SELECT s.*,
      m.name AS milestone_name,
      p.prefix AS project_prefix,
      0 AS item_count,
      0 AS done_count,
      0 AS terminal_count
    FROM sprints s
    LEFT JOIN milestones m ON m.id = s.milestone_id
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.id = ?
  `).get(result.lastInsertRowid)
  if (sprint.project_prefix && sprint.project_number != null) {
    sprint.key = `${sprint.project_prefix}#${sprint.project_number}`
  }
  res.status(201).json(sprint)
})

// PATCH /api/sprints/reorder — MUST be before /:id routes
//
// DD-287: Sprint-Order Drag&Drop-Overlay
// Akzeptiert zwei Body-Formate (Backward-Compat):
//   1) Legacy:  { ordered_ids: [id1, id2, ...] }              -> position = index
//   2) DD-287:  { items: [{id, position}, ...] }              -> explizite position
//
// Pflichten (DD-287):
//   - project-scope: nur Sprints des current project (X-Project-Id) werden geschrieben
//   - audit_log Entry pro geaendertem Sprint (action='sprint_reorder')
//   - alles in einer db.transaction
//   - Response: aktualisierte Sprint-Liste (selbe Shape wie GET /api/sprints, project-scoped)
//
// DD-287 R2 (2026-05-23): Active-Sprint-Position ist NICHT mehr fix.
//   PO-Feedback: "Auch den aktiven Sprint verschieben können." — die alte
//   Position-Fix-Regel (409 bei active-Sprint mit veraenderter position)
//   wurde entfernt. Alle Sprints (egal status) duerfen umsortiert werden.
app.patch('/api/sprints/reorder', (req, res) => {
  const projectId = currentProjectId(req)
  const { ordered_ids, items } = req.body

  // Normalize zu [{id, position}]
  let pairs = null
  if (Array.isArray(items) && items.length > 0) {
    pairs = items.map(it => ({ id: Number(it.id), position: Number(it.position) }))
    if (pairs.some(p => !Number.isFinite(p.id) || !Number.isFinite(p.position))) {
      return res.status(400).json({ error: 'items[].id und items[].position muessen Zahlen sein' })
    }
  } else if (Array.isArray(ordered_ids)) {
    pairs = ordered_ids.map((id, idx) => ({ id: Number(id), position: idx }))
    if (pairs.some(p => !Number.isFinite(p.id))) {
      return res.status(400).json({ error: 'ordered_ids muessen Zahlen sein' })
    }
  } else {
    return res.status(400).json({ error: 'Body muss items[] oder ordered_ids[] enthalten' })
  }

  if (pairs.length === 0) return res.json({ success: true, sprints: [] })

  // Lade alle betroffenen Sprints + verifiziere Project-Scope
  const ids = pairs.map(p => p.id)
  const placeholders = ids.map(() => '?').join(',')
  const existing = db.prepare(
    `SELECT id, project_id, status, position FROM sprints WHERE id IN (${placeholders})`
  ).all(...ids)

  // Alle IDs muessen existieren und zum aktuellen Projekt gehoeren
  if (existing.length !== ids.length) {
    return res.status(404).json({ error: 'Mindestens eine Sprint-ID existiert nicht' })
  }
  const wrongProject = existing.find(s => s.project_id !== projectId)
  if (wrongProject) {
    return res.status(403).json({
      error: 'Sprint gehoert nicht zum aktuellen Projekt',
      sprint_id: wrongProject.id,
    })
  }

  // DD-287 R2: Active-Sprint-Position-Fix entfernt — auch active Sprints
  // duerfen umsortiert werden (PO-Feedback 2026-05-23).

  const reorderTx = db.transaction(() => {
    const upd = db.prepare(
      'UPDATE sprints SET position = ? WHERE id = ? AND project_id = ?'
    )
    for (const p of pairs) {
      const before = existing.find(e => e.id === p.id)
      if (!before) continue
      if (before.position === p.position) continue // skip no-op
      upd.run(p.position, p.id, projectId)
      auditLog('sprints', p.id, 'sprint_reorder',
        { position: before.position },
        { position: p.position },
        'ui')
    }
  })
  reorderTx()

  // Response: aktualisierte Sprint-Liste analog GET /api/sprints (project-scoped)
  const sprints = db.prepare(`
    SELECT s.*,
      m.name AS milestone_name,
      p.prefix AS project_prefix,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id) as item_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'completed') as done_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND (SELECT rf.review_status FROM review_feedback rf WHERE rf.backlog_id = b.id ORDER BY rf.round_number DESC, rf.id DESC LIMIT 1) = 'passed') as passed_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('completed','passed','cancelled')) as terminal_count
    FROM sprints s
    LEFT JOIN milestones m ON m.id = s.milestone_id
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.project_id = ?
    ORDER BY s.position, s.id
  `).all(projectId)
  for (const s of sprints) {
    if (s.project_prefix && s.project_number != null) {
      s.key = `${s.project_prefix}#${s.project_number}`
    }
  }

  res.json({ success: true, sprints })
})

// PUT /api/sprints/:id — Edit sprint fields
// PUT /api/sprints/:id — Sprint editieren (DD-19)
//
// Regel: Felder werden nur dann angefasst, wenn der Key explizit im Body steht.
// Wenn ein Key explizit `null` traegt, wird die DB-Spalte auf NULL gesetzt
// (z.B. SprintEditModal kann Datum/Capacity loeschen). `name` bleibt
// Pflichtfeld und wird auf `NOT NULL`-Eingabe geprueft.
app.put('/api/sprints/:id', (req, res) => {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })

  // DD-511: position added so assignment-drag can persist { milestone_id, position } atomically.
  const writable = ['name', 'start_date', 'end_date', 'capacity', 'notes', 'goal', 'status', 'milestone_id', 'wip_limit', 'position']
  const sets = []
  const vals = []
  let milestoneChanged = false
  for (const key of writable) {
    if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue
    const value = req.body[key]
    if (key === 'name' && (value == null || String(value).trim() === '')) {
      return res.status(400).json({ error: 'name darf nicht leer sein' })
    }
    // DD-67: Milestone muss zum gleichen Projekt gehören.
    // DD-173: Abgeschlossene Milestones (status=reached) akzeptieren keine Sprints mehr.
    if (key === 'milestone_id' && value != null && value !== '') {
      const ms = db.prepare('SELECT project_id, status FROM milestones WHERE id = ?').get(value)
      if (!ms || ms.project_id !== sprint.project_id) {
        return res.status(400).json({ error: 'milestone_id gehört nicht zum gleichen Projekt wie der Sprint' })
      }
      if (ms.status === 'completed') {
        return res.status(422).json({ error: 'Milestone ist abgeschlossen — keine weiteren Sprints zuweisbar' })
      }
    }
    // DD-511: position must be a finite number when provided.
    // coerceSprintPosition handles null/empty/whitespace → NULL sentinel, and
    // validates that non-null values are finite numbers. The coerced number (not
    // the raw string) is persisted, so "3.5" → 3.5 and "  " → null.
    if (key === 'position') {
      const result = coerceSprintPosition(value)
      if (!result.ok) {
        return res.status(400).json({ error: result.error })
      }
      sets.push(`${key} = ?`)
      vals.push(result.value)
      continue
    }
    if (key === 'milestone_id') milestoneChanged = true
    sets.push(`${key} = ?`)
    vals.push(value === '' ? null : value)
  }

  if (sets.length === 0) {
    return res.json(sprint)
  }

  vals.push(req.params.id)
  db.prepare(`UPDATE sprints SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  // Auto-Sync: wenn milestone_id geaendert wurde, denormalisierten Cache
  // backlog.milestone fuer alle Items dieses Sprints aktualisieren.
  if (milestoneChanged) {
    syncBacklogMilestoneForSprint(req.params.id)
    // DD-293: Audit-Log-Entry für nachträgliche Milestone-Zuordnung
    // (Backfill-UI in /milestones / /sprint/<id>). Diff wird als
    // {milestone_id: <old|null>} → {milestone_id: <new|null>} festgehalten,
    // damit die Bewegung von "kein Milestone → M2" oder umgekehrt
    // nachvollziehbar bleibt. auditLog() failure-tolerant — kein Throw.
    const oldMid = sprint.milestone_id ?? null
    const newMidRaw = req.body.milestone_id
    const newMid = newMidRaw === '' || newMidRaw == null ? null : Number(newMidRaw)
    if (oldMid !== newMid) {
      auditLog(
        'sprints',
        Number(req.params.id),
        'sprint_milestone_assign',
        { milestone_id: oldMid },
        { milestone_id: newMid },
        'devd-ui',
      )
    }
  }

  // Response inklusive milestone_name + counts (analog GET /api/sprints),
  // damit das Frontend ohne Reload die Pille korrekt rendert.
  const updated = db.prepare(`
    SELECT s.*,
      m.name AS milestone_name,
      p.prefix AS project_prefix,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id) as item_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'completed') as done_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND (SELECT rf.review_status FROM review_feedback rf WHERE rf.backlog_id = b.id ORDER BY rf.round_number DESC, rf.id DESC LIMIT 1) = 'passed') as passed_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('completed','passed','cancelled')) as terminal_count
    FROM sprints s
    LEFT JOIN milestones m ON m.id = s.milestone_id
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.id = ?
  `).get(req.params.id)
  res.json(updated)
})

// DD-90: Sprint löschen — nur wenn keine Items zugewiesen sind.
// Aktive/closed Sprints können trotzdem gelöscht werden, sofern leer.
// GET /api/sprints/:id/delete-preview — Counts für den TUI-Confirm (T02b).
app.get('/api/sprints/:id/delete-preview', (req, res) => {
  const sprint = db.prepare('SELECT id, name FROM sprints WHERE id = ?').get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })
  const issues = db.prepare('SELECT COUNT(*) AS c FROM backlog WHERE assigned_sprint = ?').get(req.params.id).c
  const documents = sprintDocumentCount(db, Number(req.params.id))
  res.json({ sprint_id: Number(req.params.id), sprint_name: sprint.name, issues, documents })
})

app.delete('/api/sprints/:id', (req, res) => {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })
  const cascade = req.query.cascade === '1' || req.query.cascade === 'true'

  const itemCount = db.prepare('SELECT COUNT(*) AS c FROM backlog WHERE assigned_sprint = ?').get(req.params.id).c
  const docCount = sprintDocumentCount(db, Number(req.params.id))
  // Ohne ?cascade=1 bleibt das alte Schutz-Verhalten: 409 wenn Items zugewiesen.
  if (!cascade && itemCount > 0) {
    return res.status(409).json({
      error: 'sprint_has_items',
      detail: `${itemCount} Item(s) zugewiesen — zuerst entfernen, verschieben, oder ?cascade=1 zum Mitlöschen.`,
      item_count: itemCount,
    })
  }

  db.transaction(() => {
    // cascadeDeleteSprints räumt Issues (inkl. Kinder) + Sprint.
    cascadeDeleteSprints(db, [Number(req.params.id)])
    db.prepare(`INSERT INTO audit_log (agent_id, action, table_name, record_id, old_value, new_value)
                VALUES (?, ?, ?, ?, ?, ?)`).run(
      'devd-ui', cascade ? 'delete_cascade' : 'delete', 'sprints', req.params.id, JSON.stringify(sprint), null
    )
  })()

  // deleted_id bleibt für Rückwärtskompatibilität (OpenAPI-Schema + alt-CLI).
  res.json({ ok: true, deleted_id: Number(req.params.id), deleted: { sprint_id: Number(req.params.id), issues: itemCount, documents: docCount } })
})

// Helper — DD-Erik-Feedback: backlog.milestone als denormalisierten Cache der
// Sprint→Milestone-Beziehung pflegen. Wird aufgerufen von:
//  - PUT /api/sprints/:id (wenn milestone_id geaendert)
//  - PATCH /api/backlog/:id/sprint (wenn assigned_sprint geaendert)
//  - PATCH /api/backlog/bulk (action=set_sprint)
function syncBacklogMilestoneForSprint(sprintId) {
  if (!sprintId) return
  const milestone = db.prepare(`
    SELECT m.name FROM sprints s
    LEFT JOIN milestones m ON m.id = s.milestone_id
    WHERE s.id = ?
  `).get(sprintId)
  const name = milestone?.name || null
  db.prepare('UPDATE backlog SET milestone = ? WHERE assigned_sprint = ?').run(name, sprintId)
}
function syncBacklogMilestoneForItem(itemId) {
  const item = db.prepare('SELECT assigned_sprint FROM backlog WHERE id = ?').get(itemId)
  if (!item) return
  if (!item.assigned_sprint) {
    db.prepare('UPDATE backlog SET milestone = NULL WHERE id = ?').run(itemId)
    return
  }
  const milestone = db.prepare(`
    SELECT m.name FROM sprints s
    LEFT JOIN milestones m ON m.id = s.milestone_id
    WHERE s.id = ?
  `).get(item.assigned_sprint)
  db.prepare('UPDATE backlog SET milestone = ? WHERE id = ?').run(milestone?.name || null, itemId)
}

// --- DD-39: Export Markdown / CSV ---
function csvEscape(v) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function backlogRowsForExport(projectId, { search, status, tags } = {}) {
  const filters = ['b.project_id = ?']
  const args = [projectId]
  if (search) {
    filters.push('(b.title LIKE ? OR b.context_notes LIKE ?)')
    const q = `%${search}%`; args.push(q, q)
  }
  // DD2-123: Default-Statusfilter new,refined (sprintgebundene Status wie planned/
  // in_progress gehören nicht in einen Backlog-Export). status kann komma-separiert
  // weiter einengen (z.B. "new" oder "new,refined").
  const statusList = (status && String(status).trim())
    ? String(status).split(',').map(s => s.trim()).filter(Boolean)
    : ['new', 'refined']
  if (statusList.length) {
    filters.push(`b.status IN (${statusList.map(() => '?').join(',')})`)
    args.push(...statusList)
  }
  return db.prepare(`
    SELECT b.id, b.title, b.status, b.type, b.priority, b.milestone, b.assigned_sprint,
           b.created_at, b.completed_at, p.prefix, b.project_number,
           s.name AS sprint_name
    FROM backlog b
    LEFT JOIN projects p ON p.id = b.project_id
    LEFT JOIN sprints s ON s.id = b.assigned_sprint
    WHERE ${filters.join(' AND ')}
    ORDER BY b.priority ASC, b.id ASC
  `).all(...args)
}

function tagsByBacklogId(ids) {
  if (!ids.length) return new Map()
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT bt.backlog_id, t.name FROM backlog_tags bt
    JOIN tags t ON t.id = bt.tag_id
    WHERE bt.backlog_id IN (${placeholders})
    ORDER BY t.name
  `).all(...ids)
  const m = new Map()
  for (const r of rows) {
    if (!m.has(r.backlog_id)) m.set(r.backlog_id, [])
    m.get(r.backlog_id).push(r.name)
  }
  return m
}

function isoDate() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

app.get('/api/sprints/:id/export', (req, res) => {
  const sprintId = Number(req.params.id)
  const sprint = db.prepare('SELECT s.*, p.prefix FROM sprints s LEFT JOIN projects p ON p.id = s.project_id WHERE s.id = ?').get(sprintId)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })
  const format = (req.query.format || 'md').toLowerCase()
  const items = db.prepare(`
    SELECT b.id, b.title, b.status, b.type, b.priority, b.context_notes, b.completed_at,
           p.prefix, b.project_number
    FROM backlog b
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.assigned_sprint = ?
    ORDER BY b.status, b.priority, b.id
  `).all(sprintId)
  const tagMap = tagsByBacklogId(items.map(i => i.id))
  const filename = `${(sprint.prefix || 'sprint').toLowerCase()}-sprint-${sprintId}-${isoDate()}.${format === 'csv' ? 'csv' : 'md'}`

  if (format === 'csv') {
    const header = ['id','key','title','status','type','priority','tags','completed_at']
    const lines = [header.join(',')]
    for (const it of items) {
      const key = it.prefix && it.project_number ? `${it.prefix}-${it.project_number}` : ''
      const tags = (tagMap.get(it.id) || []).join(';')
      lines.push([it.id, key, it.title, it.status, it.type, it.priority, tags, it.completed_at || ''].map(csvEscape).join(','))
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(lines.join('\n'))
  }

  // Markdown
  const buckets = { completed: [], passed: [], in_progress: [], to_review: [], planned: [], refined: [], cancelled: [] }
  for (const it of items) (buckets[it.status] || (buckets[it.status] = [])).push(it)
  const md = []
  md.push(`# ${sprint.name}`)
  md.push('')
  if (sprint.start_date || sprint.end_date) {
    md.push(`**Zeitraum:** ${sprint.start_date || '?'} – ${sprint.end_date || '?'}`)
  }
  md.push(`**Status:** ${sprint.status}`)
  if (sprint.notes) { md.push(''); md.push(sprint.notes) }
  md.push('')
  const sectionOrder = [
    ['completed', 'Completed'],
    ['passed', 'Passed'],
    ['in_progress', 'In Arbeit'],
    ['to_review', 'Review'],
    ['planned', 'Geplant'],
    ['refined', 'Refined'],
    ['cancelled', 'Storniert'],
  ]
  for (const [statusKey, label] of sectionOrder) {
    const list = buckets[statusKey] || []
    if (!list.length) continue
    md.push(`## ${label} (${list.length})`)
    for (const it of list) {
      const key = it.prefix && it.project_number ? `${it.prefix}-${it.project_number}` : `#${it.id}`
      md.push(`- [${key}] ${it.title} — P${it.priority} · ${it.type}`)
    }
    md.push('')
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(md.join('\n'))
})

// GET /api/backlog-export — eigener Pfad (nicht /api/backlog/...), damit
// /api/backlog/:id-Route nicht mit-matcht.
app.get('/api/backlog-export', (req, res) => {
  const projectId = currentProjectId(req)
  const project = db.prepare('SELECT prefix FROM projects WHERE id = ?').get(projectId)
  const items = backlogRowsForExport(projectId, { search: req.query.search, status: req.query.status })
  // DD2-123: Tags pro Item anhängen, damit der pure Serializer sie ohne DB sieht.
  const tagMap = tagsByBacklogId(items.map(i => i.id))
  for (const it of items) it.tags = tagMap.get(it.id) || []

  const { body, contentType, ext } = serializeBacklog(items, req.query.format)
  const filename = `${(project?.prefix || 'backlog').toLowerCase()}-backlog-${isoDate()}.${ext}`
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(body)
})

// POST /api/sprints/:id/complete — Sprint abschliessen (PO-Button + Agent-API)
// DD-108: jedes Item muss latest_review.review_status='passed' haben.
//   Items mit Lifecycle-Status 'cancelled' werden ignoriert.
//   Force-Override via ?force=1 (Audit-Log markiert das).
app.post('/api/sprints/:id/complete', (req, res) => {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })

  if (sprint.status === 'completed') {
    return res.status(409).json({ error: `Sprint ist bereits ${sprint.status}` })
  }
  if (sprint.status === 'cancelled') {
    return res.status(422).json({ error: 'Stornierter Sprint kann nicht abgeschlossen werden' })
  }

  const force = req.query.force === '1' || req.body?.force === true
  const openItems = db.prepare(`
    SELECT b.id, b.project_number, b.title, b.status,
           rf.review_status as review_status, rf.round_number as review_round
    FROM backlog b
    LEFT JOIN review_feedback rf ON rf.backlog_id = b.id
      AND rf.id = (SELECT MAX(id) FROM review_feedback WHERE backlog_id = b.id)
    WHERE b.assigned_sprint = ? AND b.status != 'cancelled'
  `).all(req.params.id)
  const missing = openItems.filter(i => i.review_status !== 'passed')
  if (missing.length > 0 && !force) {
    return res.status(422).json({
      error: 'Sprint kann nicht abgeschlossen werden — nicht alle Items haben einen passed-Review.',
      open_items: missing.map(i => ({
        id: i.id,
        project_number: i.project_number,
        title: i.title,
        review_status: i.review_status || 'pending',
        review_round: i.review_round || null,
      })),
    })
  }

  const today = new Date().toISOString().slice(0, 10)

  // ADR 2026-04-29 / DD2-155: sprint complete setzt alle passed-Items final auf completed.
  const completeTx = db.transaction(() => {
    for (const item of openItems) {
      if (item.review_status === 'passed' && item.status !== 'completed') {
        const prevStatus = item.status
        db.prepare("UPDATE backlog SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE id=?").run(item.id)
        auditLog('backlog', item.id, 'status_change',
          { status: prevStatus }, { status: 'completed', reason: 'sprint_completed' }, 'system-auto')
      }
    }
    db.prepare(`
      UPDATE sprints SET
        status = 'completed',
        end_date = COALESCE(end_date, ?)
      WHERE id = ?
    `).run(today, req.params.id)
  })
  completeTx()

  const updated = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  auditLog('sprint', Number(req.params.id), 'status_change',
    { status: sprint.status }, { status: 'completed', forced: force || undefined },
    'dashboard-po')
  res.json(updated)
})

// PATCH /api/sprints/:id/status — generischer Sprint-Status-Übergang
// Body: { to: 'new'|'planned'|'in_progress'|'to_review'|'cancelled', cancellationNotes?: string }
// completed wird über POST /api/sprints/:id/complete gesetzt (mit Pre-Conditions).
app.patch('/api/sprints/:id/status', (req, res) => {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })

  const { to, cancellationNotes } = req.body || {}
  if (!to) return res.status(400).json({ error: 'to ist Pflicht' })
  if (to === 'completed') {
    return res.status(400).json({ error: 'Verwende POST /api/sprints/:id/complete für completed (prüft passed-Reviews)' })
  }

  const ctx = { cancellationNotes }
  const { allowed, reason } = canSprintTransition(sprint.status, to, ctx)
  if (!allowed) return res.status(422).json({ error: reason })

  // DD-158: Idempotenz — bei from===to (reason='no-op') kein UPDATE, kein
  // notes-Append, kein Audit-Log. Snapshot zurückgeben.
  if (reason !== 'no-op') {
    db.prepare('UPDATE sprints SET status = ? WHERE id = ?').run(to, req.params.id)
    auditLog('sprint', Number(req.params.id), 'status_change',
      { status: sprint.status }, { status: to, ...(cancellationNotes ? { cancellationNotes } : {}) },
      'dashboard-po')
    // DD-160: notes-Append bei cancel als separater edit-Audit-Eintrag (Lösung A
    // aus Issue-Context). Saubere Trennung Status-Wechsel vs. Field-Edit, gleicher
    // Pattern wie andere edit-Calls. Leerer cancellationNotes → kein edit-Eintrag.
    if (to === 'cancelled' && cancellationNotes) {
      const before = sprint.notes
      const append = `[Cancelled] ${cancellationNotes}`
      const after = before ? `${before}\n${append}` : append
      db.prepare("UPDATE sprints SET notes = ? WHERE id = ?").run(after, req.params.id)
      auditLog('sprint', Number(req.params.id), 'edit',
        { notes: before }, { notes: after },
        'dashboard-po')
    }
  }

  const updated = db.prepare(`
    SELECT s.*, p.prefix AS project_prefix
    FROM sprints s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.id = ?
  `).get(req.params.id)
  res.json(updated)
})

// ---- Reviews ----

// POST /api/backlog/:id/reviews — neue Review-Runde anlegen (DD-100)
// round_number = MAX(round_number)+1, review_status='pending', optional notes.
// (Die ehemalige Klick-Annotations-Spalte wurde in Migration 006 entfernt; das
// zugehoerige Live-Preview-Feature ist in DD-521 ersatzlos gestrichen.)
app.post('/api/backlog/:id/reviews', (req, res) => {
  const { notes, review_status, comment } = req.body || {}
  const backlogId = Number(req.params.id)
  const item = db.prepare('SELECT id FROM backlog WHERE id = ?').get(backlogId)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  // DD-507: Edit-Gate — solange der zugewiesene Sprint eine submitted
  // Review-Iteration hat, sind Runden-Edits gesperrt (409).
  try {
    assertReviewEditable(db, backlogId)
  } catch (err) {
    if (err instanceof ReviewEditLockedError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  // Atomares Review-Anlegen mit Verdict (Lessons CONOS 2026-05-07): Body kann
  // optional `review_status` + `comment` enthalten — Round wird direkt mit dem
  // Verdict angelegt, autoSetPassedOnReviewPass / autoSetRejectedOnReviewFail
  // werden ausgeführt. Default ohne review_status: 'pending' (Legacy-Verhalten).
  let initialStatus = 'pending'
  if (review_status !== undefined && review_status !== null) {
    if (!REVIEW_STATUSES.has(review_status)) {
      return res.status(422).json({ error: `review_status muss in ${[...REVIEW_STATUSES].join('|')} sein` })
    }
    initialStatus = review_status
  }
  if (initialStatus === 'not_passed' && !comment) {
    return res.status(422).json({ error: 'comment ist Pflichtfeld bei not_passed' })
  }

  const maxRound = db.prepare(
    'SELECT MAX(round_number) as mr FROM review_feedback WHERE backlog_id = ?'
  ).get(backlogId)
  const roundNumber = (maxRound?.mr ?? 0) + 1

  const result = db.prepare(
    `INSERT INTO review_feedback (backlog_id, round_number, review_status, notes, comment) VALUES (?, ?, ?, ?, ?)`
  ).run(backlogId, roundNumber, initialStatus, notes || null, comment || null)

  if (initialStatus === 'passed') autoSetPassedOnReviewPass(db, backlogId, auditLog)
  if (initialStatus === 'not_passed') autoSetRejectedOnReviewFail(db, backlogId, auditLog)

  const entry = db.prepare('SELECT * FROM review_feedback WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(entry)
})

// POST /api/backlog/:id/review/reopen — Review wieder öffnen (DD-662, DD2-7).
//
// Öffnet eine frische pending-Runde auf einem Issue, dessen letzte Runde bereits
// ein Verdict trägt, und setzt den Sprint-Review-Marker zurück — damit
// `review create` danach wieder durchläuft (kein 409). Idempotent: ist die letzte
// Runde bereits offen, wird keine neue angelegt (200). Schließt die DD#81-Lücke,
// in der ein verdictloser Sprint-Review-Submit Issues unentrinnbar im to_review
// gefangen hielt und nur der UI-Rework-Button half.
//
// DD2-7: Guard von strikt to_review auf REOPENABLE_STATUSES (to_review/passed/
// rejected) geweitet — der Review-Deadlock (Status=passed, letztes Verdikt
// not_passed, Sprint submitted) ist damit per direktem reopen lösbar, ohne den
// Mehrschritt-Status-Tanz / w:Rework-Workaround.
//
// DD-186 unberührt: das Verb ändert keine Berechtigung, nur die API-Fläche;
// das Setzen eines Verdicts bleibt PO-Aufgabe.
app.post('/api/backlog/:id/review/reopen', (req, res) => {
  const backlogId = Number(req.params.id)
  const item = db.prepare('SELECT id, status FROM backlog WHERE id = ?').get(backlogId)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  if (!canReopenReview(item.status)) {
    return res.status(422).json({
      error: `review reopen nur aus ${[...REOPENABLE_STATUSES].join('/')} möglich (Issue ist '${item.status}')`,
    })
  }
  const result = reopenReviewRound(db, backlogId, auditLog)
  res.json(result)
})

// PATCH /api/reviews/:id — Review-Runde bewerten (DD-100)
// review_status ∈ {passed, not_passed}, optional comment, updated_at automatisch.
const REVIEW_STATUSES = new Set(['passed', 'not_passed', 'pending'])

// DD-111 (umgebaut, ADR 2026-04-29): Verdict→Status-Sync lebt jetzt in
// server/lib/reviewMarker.js (autoSetPassedOnReviewPass / autoSetRejectedOnReviewFail),
// damit die Invariante unittestbar ist. Aufruf nach jedem Verdict-Schreibweg.

app.patch('/api/reviews/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = db.prepare('SELECT id, backlog_id FROM review_feedback WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Review not found' })

  // DD-507: Edit-Gate — Runde → backlog_id → backlog.assigned_sprint; ist dessen
  // Review-Iteration submitted, sind Edits gesperrt (409).
  try {
    assertReviewEditable(db, row.backlog_id)
  } catch (err) {
    if (err instanceof ReviewEditLockedError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const { status, comment, notes } = req.body || {}
  const sets = []
  const vals = []
  if (status !== undefined) {
    if (!REVIEW_STATUSES.has(status)) {
      return res.status(422).json({ error: `status muss in ${[...REVIEW_STATUSES].join('|')} sein` })
    }
    sets.push('review_status = ?'); vals.push(status)
  }
  if (comment !== undefined) {
    sets.push('comment = ?'); vals.push(comment || null)
  }
  // DD-684: notes auf der Runde patchbar machen. Ohne dies verwarf der
  // Notes-only-Save des Desktop-Review-Panels (PATCH {notes}) still mit 400
  // „Nothing to update" — die Review-Notes wurden nie persistiert.
  if (notes !== undefined) {
    sets.push('notes = ?'); vals.push(notes || null)
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' })

  sets.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(id)
  db.prepare(`UPDATE review_feedback SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  if (status === 'passed') autoSetPassedOnReviewPass(db, row.backlog_id, auditLog)
  if (status === 'not_passed') autoSetRejectedOnReviewFail(db, row.backlog_id, auditLog)

  const updated = db.prepare('SELECT * FROM review_feedback WHERE id = ?').get(id)
  res.json(updated)
})

// GET /api/backlog/:id/reviews — All review rounds
app.get('/api/backlog/:id/reviews', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM review_feedback WHERE backlog_id = ? ORDER BY round_number ASC'
  ).all(req.params.id)

  for (const row of rows) {
    row.screenshots = db.prepare(
      'SELECT * FROM review_screenshots WHERE feedback_id = ?'
    ).all(row.id)
  }

  res.json(rows)
})

// DD-521: Live-Preview/iframe-Feature hart entfernt. Die ehemaligen Endpoints
// (/api/preview-settings, /api/sprints/:id/visual-feedback) hingen an der
// Klick-Annotations-Spalte, die bereits in Migration 006 entfernt wurde —
// also bereits totes, gebrochenes Dead-Code. Ersatzlos gestrichen.

// GET /api/reviews — Reviews des aktiven Projekts (DD-3)
//
// review_feedback hat keine eigene project_id, deshalb wird der Filter
// indirekt ueber backlog.project_id = currentProjectId(req) angewandt.
// Optional: ?backlog_id=...  ?sprint_id=...  ?status=... (review_status).
app.get('/api/reviews', (req, res) => {
  const projectId = currentProjectId(req)
  const conditions = ['b.project_id = ?']
  const params = [projectId]

  if (req.query.backlog_id) {
    conditions.push('rf.backlog_id = ?')
    params.push(Number(req.query.backlog_id))
  }
  if (req.query.sprint_id) {
    conditions.push('b.assigned_sprint = ?')
    params.push(Number(req.query.sprint_id))
  }
  if (req.query.status) {
    conditions.push('(rf.review_status = ? OR rf.status = ?)')
    params.push(req.query.status, req.query.status)
  }

  const rows = db.prepare(`
    SELECT rf.*,
      b.title as backlog_title,
      b.project_number,
      b.type as backlog_type,
      b.status as backlog_status,
      p.prefix as project_prefix
    FROM review_feedback rf
    JOIN backlog b ON b.id = rf.backlog_id
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY rf.created_at DESC
  `).all(...params)

  res.json(rows)
})

// PATCH /api/reviews/:id — Set review status/notes
app.patch('/api/reviews/:id', (req, res) => {
  const { review_status, notes } = req.body
  const sets = []
  const vals = []

  if (review_status !== undefined) { sets.push('review_status = ?'); vals.push(review_status) }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes) }
  if (sets.length === 0) return res.status(400).json({ error: 'Nichts zu aktualisieren' })

  sets.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(req.params.id)

  db.prepare(`UPDATE review_feedback SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  const updated = db.prepare('SELECT * FROM review_feedback WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// ---- Memory Routes ----
//
// DD-274: the Memory-stack (sqlite-vec extension + Ollama embeddings) is only
// guaranteed to be available on the developer's Mac. On hosts where the
// extension cannot load (e.g. the NAS container that ships better-sqlite3
// without sqlite-vec), every memory-call would otherwise bubble a raw 500.
// We catch those failures and respond with a structured 503 so the client can
// surface a meaningful banner instead of a cryptic crash.

function memoryUnavailableResponse(res, err) {
  console.warn('[memory] backend unavailable:', err?.message || err)
  return res.status(503).json({
    error: 'memory_unavailable',
    message:
      'Memory-Backend nicht verfügbar — sqlite-vec oder Ollama fehlt auf diesem Host. ' +
      'Memory-Feature ist nur in der lokalen DevDashboard-Instanz nutzbar.',
  })
}

// GET /api/memories — Liste mit Filtern und Pagination
app.get('/api/memories', (req, res) => {
  try {
    const { q, domain, area, wichtigkeit, schlagwort, page } = req.query
    const result = listMemories({
      q: q || undefined,
      domain: domain || undefined,
      area: area || undefined,
      wichtigkeit: wichtigkeit || undefined,
      schlagwort: schlagwort || undefined,
      page: page ? Number(page) : 1,
    })
    res.json(result)
  } catch (err) {
    return memoryUnavailableResponse(res, err)
  }
})

// GET /api/memories/:id — Einzelnes Memory
app.get('/api/memories/:id', (req, res) => {
  try {
    const memory = getMemory(req.params.id)
    if (!memory) return res.status(404).json({ error: 'Memory nicht gefunden' })
    res.json(memory)
  } catch (err) {
    return memoryUnavailableResponse(res, err)
  }
})

// POST /api/memories — Anlegen
app.post('/api/memories', async (req, res) => {
  const { text, domain, area, wichtigkeit, schlagwoerter } = req.body || {}
  if (!text || !domain || !area) {
    return res.status(400).json({ error: 'text, domain und area sind Pflichtfelder' })
  }
  if (!['Privat', 'Beruf', 'Wissen'].includes(domain)) {
    return res.status(400).json({ error: 'domain muss Privat, Beruf oder Wissen sein' })
  }
  try {
    const embeddingBytes = await getEmbedding(text)
    const memory = insertMemory({ text, domain, area, wichtigkeit, schlagwoerter }, embeddingBytes)
    if (!embeddingBytes) {
      return res.status(201).json({ ...memory, _warning: 'Embedding fehlgeschlagen — semantische Suche veraltet' })
    }
    res.status(201).json(memory)
  } catch (err) {
    return memoryUnavailableResponse(res, err)
  }
})

// PUT /api/memories/:id — Bearbeiten
app.put('/api/memories/:id', async (req, res) => {
  try {
    const existing = getMemory(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Memory nicht gefunden' })

    const data = req.body || {}
    if (data.domain !== undefined && !['Privat', 'Beruf', 'Wissen'].includes(data.domain)) {
      return res.status(400).json({ error: 'domain muss Privat, Beruf oder Wissen sein' })
    }
    const textChanged = data.text !== undefined && data.text !== existing.text
    const embeddingBytes = textChanged ? await getEmbedding(data.text) : null

    const memory = updateMemory(req.params.id, data, embeddingBytes)
    if (textChanged && !embeddingBytes) {
      return res.json({ ...memory, _warning: 'Embedding fehlgeschlagen — semantische Suche veraltet' })
    }
    res.json(memory)
  } catch (err) {
    return memoryUnavailableResponse(res, err)
  }
})

// DELETE /api/memories/:id — Löschen
app.delete('/api/memories/:id', (req, res) => {
  try {
    const existing = getMemory(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Memory nicht gefunden' })
    deleteMemory(req.params.id)
    res.status(204).end()
  } catch (err) {
    return memoryUnavailableResponse(res, err)
  }
})

// DD-237: static-serve the built SPA. In production the Vite build lives at
// /app/dist (baked into the image by Dockerfile stage 1). Local-dev still
// boots Vite on its own port — this block only does work when dist/ exists.
// ============================================================
// DD-280 (M3-S01 T03): Project-Home ToDo CRUD + Links REST API.
// Pfade: /api/projects/:project_id/todos (Liste/Create), /todos/:id (Patch/Delete),
//        /todos/reorder, /todos/:tid/links (Add), /todos/:tid/links/:lid (Delete).
// project_id wird aus dem Path-Parameter genommen (orthogonal zu X-Project-Id Header).
// ============================================================

function _sendTodoError(res, err) {
  if (err && err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code, field: err.field })
  }
  console.error('[project-todos] unexpected error', err)
  return res.status(500).json({ error: 'Internal Server Error' })
}

// REORDER MUSS vor :id deklariert werden (sonst matcht :id="reorder").
app.patch('/api/projects/:project_id/todos/reorder', (req, res) => {
  const projectId = Number(req.params.project_id)
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: 'project_id muss positive Ganzzahl sein' })
  }
  const order = Array.isArray(req.body?.order) ? req.body.order.map(Number) : null
  try {
    const updated = reorderTodos(db, projectId, order)
    res.json({ updated })
  } catch (e) {
    return _sendTodoError(res, e)
  }
})

app.get('/api/projects/:project_id/todos', (req, res) => {
  const projectId = Number(req.params.project_id)
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: 'project_id muss positive Ganzzahl sein' })
  }
  try {
    res.json(listTodos(db, projectId, { status: req.query.status }))
  } catch (e) {
    return _sendTodoError(res, e)
  }
})

app.post('/api/projects/:project_id/todos', (req, res) => {
  const projectId = Number(req.params.project_id)
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: 'project_id muss positive Ganzzahl sein' })
  }
  try {
    const todo = insertTodo(db, projectId, req.body || {})
    auditLog('project_todos', todo.id, 'project_todo_create', null, { label: todo.label }, req.body?.agent_id || 'ui')
    res.status(201).json(todo)
  } catch (e) {
    return _sendTodoError(res, e)
  }
})

app.patch('/api/projects/:project_id/todos/:id', (req, res) => {
  const todoId = Number(req.params.id)
  if (!Number.isInteger(todoId) || todoId <= 0) {
    return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  }
  try {
    const before = db.prepare('SELECT label, status, details FROM project_todos WHERE id = ?').get(todoId)
    const updated = patchTodo(db, todoId, req.body || {})
    auditLog('project_todos', todoId, 'project_todo_update', before, updated, req.body?.agent_id || 'ui')
    res.json(updated)
  } catch (e) {
    return _sendTodoError(res, e)
  }
})

app.delete('/api/projects/:project_id/todos/:id', (req, res) => {
  const todoId = Number(req.params.id)
  if (!Number.isInteger(todoId) || todoId <= 0) {
    return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  }
  try {
    const before = db.prepare('SELECT label FROM project_todos WHERE id = ?').get(todoId)
    deleteTodo(db, todoId)
    auditLog('project_todos', todoId, 'project_todo_delete', before, null, 'ui')
    res.status(204).end()
  } catch (e) {
    return _sendTodoError(res, e)
  }
})

app.post('/api/projects/:project_id/todos/:tid/links', (req, res) => {
  const todoId = Number(req.params.tid)
  if (!Number.isInteger(todoId) || todoId <= 0) {
    return res.status(400).json({ error: 'tid muss positive Ganzzahl sein' })
  }
  try {
    const link = addTodoLink(db, todoId, req.body || {})
    auditLog('todo_links', link.id, 'todo_link_create', null, { type: link.type, target: link.target }, 'ui')
    res.status(201).json(link)
  } catch (e) {
    return _sendTodoError(res, e)
  }
})

app.delete('/api/projects/:project_id/todos/:tid/links/:lid', (req, res) => {
  const linkId = Number(req.params.lid)
  if (!Number.isInteger(linkId) || linkId <= 0) {
    return res.status(400).json({ error: 'lid muss positive Ganzzahl sein' })
  }
  try {
    const before = db.prepare('SELECT type, target FROM todo_links WHERE id = ?').get(linkId)
    removeTodoLink(db, linkId)
    auditLog('todo_links', linkId, 'todo_link_delete', before, null, 'ui')
    res.status(204).end()
  } catch (e) {
    return _sendTodoError(res, e)
  }
})

// ============================================================
// MEM-9 (MEM#5): project_memories — projektgebundenes Memory (FTS5-first).
// Scope über X-Project-Id (currentProjectId). /search VOR /:id registrieren.
// ============================================================

function _sendProjectMemoryError(res, e) {
  if (e instanceof ProjectMemoryError) {
    const body = { error: e.message, code: e.code, field: e.field }
    if (e.suggestions) body.suggestions = e.suggestions   // MEM-25: Tag-Register „Meintest du …"
    if (e.unknown) body.unknown = e.unknown
    return res.status(e.statusCode).json(body)
  }
  console.error('[project-memories] unexpected error', e)
  return res.status(500).json({ error: 'Internal Server Error' })
}

app.get('/api/project-memories', (req, res) => {
  try {
    const rows = listProjectMemories(db, currentProjectId(req), { category: req.query.category })
    sendList(req, res, rows, COMPACT_MEMORY_KEYS)   // DD-622: Compact-Default (ohne content; ?fields=full opt-in)
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.get('/api/project-memories/search', (req, res) => {
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  try {
    res.json(searchProjectMemories(db, currentProjectId(req), req.query.q, { category: req.query.category, limit }))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.post('/api/project-memories', (req, res) => {
  try {
    res.status(201).json(createProjectMemory(db, currentProjectId(req), req.body || {}))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

// MEM-11: Snapshot-Rendering (?split=1 → {stable, volatile} für @import-Cache-Split).
app.get('/api/project-memories/snapshot', (req, res) => {
  try {
    if (req.query.split === '1' || req.query.split === 'true') {
      return res.json(renderProjectMemorySplitSnapshot(db, currentProjectId(req)))
    }
    res.json({ markdown: renderProjectMemorySnapshot(db, currentProjectId(req), { stability: req.query.stability, category: req.query.category }) })
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

// MEM-11: addressierbare D-Code-Row + Section-Patch per Anchor (kein Full-SSTD-Rewrite).
app.get('/api/project-memories/anchor/:anchor', (req, res) => {
  try {
    const row = getProjectMemoryByAnchor(db, currentProjectId(req), req.params.anchor)
    if (!row) return res.status(404).json({ error: 'Anchor nicht gefunden', code: 'ANCHOR_NOT_FOUND' })
    res.json(row)
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.patch('/api/project-memories/anchor/:anchor', (req, res) => {
  try {
    res.json(patchProjectMemoryByAnchor(db, currentProjectId(req), req.params.anchor, req.body || {}))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.get('/api/project-memories/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  }
  try {
    const row = getProjectMemory(db, currentProjectId(req), id)
    if (!row) return res.status(404).json({ error: 'Memory nicht gefunden', code: 'MEMORY_NOT_FOUND' })
    res.json(row)
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.patch('/api/project-memories/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  }
  try {
    res.json(updateProjectMemory(db, currentProjectId(req), id, req.body || {}))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.delete('/api/project-memories/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  }
  try {
    deleteProjectMemory(db, currentProjectId(req), id)
    res.status(204).end()
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

// Append-only-Korrektur: neue Row + alte auf superseded_by zeigen lassen.
app.post('/api/project-memories/:id/supersede', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id muss positive Ganzzahl sein' })
  }
  try {
    res.status(201).json(supersedeProjectMemory(db, currentProjectId(req), id, req.body || {}))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

// ============================================================
// MEM-25: memory_tags — kuratiertes Stichwort-Register (Controlled Vocabulary).
// Grill 2026-06-21 D06-D11. Scope über X-Project-Id. ProjectMemoryError-Mapping.
// ============================================================

app.get('/api/project-memory-tags', (req, res) => {
  try {
    res.json(listMemoryTags(db, currentProjectId(req), { query: req.query.query }))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.post('/api/project-memory-tags', (req, res) => {
  try {
    const { tag, description } = req.body || {}
    res.status(201).json(createMemoryTag(db, currentProjectId(req), tag, { description }))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.post('/api/project-memory-tags/rename', (req, res) => {
  try {
    const { old: oldTag, from, new: newTag, to } = req.body || {}
    res.json(renameMemoryTag(db, currentProjectId(req), oldTag ?? from, newTag ?? to))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

// MEM-25 (T08c): Singleton-/Drop-Bereinigung — strippt aus allen aktiven Memories alle
// Tokens, die NICHT im Register stehen. Mutierend, idempotent. /prune VOR /:tag-Route egal
// (distinkter Pfad), aber wir registrieren sie vor der :tag-Route zur Klarheit.
app.post('/api/project-memory-tags/prune', (req, res) => {
  try {
    res.json(pruneMemoryTags(db, currentProjectId(req)))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

app.delete('/api/project-memory-tags/:tag', (req, res) => {
  try {
    res.json(deleteMemoryTag(db, currentProjectId(req), req.params.tag))
  } catch (e) {
    return _sendProjectMemoryError(res, e)
  }
})

const DIST_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  // SPA fallback for client-side routes. Skip /api and /uploads so 404s
  // from those namespaces stay JSON / static rather than getting rewritten
  // to index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

// JSON error handler — keep HTML 500 stack traces out of API responses
app.use('/api', (err, req, res, _next) => {
  console.error('[api error]', err)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

// DD-232: bind to HOST + PORT from ENV. Default 5556 retains local-dev
// compatibility; container deployments set PORT=3001 + HOST=0.0.0.0 via compose env.
const PORT = Number(process.env.PORT) || 5556
const HOST = process.env.HOST || '0.0.0.0'
const server = http.createServer(app)

server.listen(PORT, HOST, () => {
  console.log(`API running on http://${HOST}:${PORT}`)
})
