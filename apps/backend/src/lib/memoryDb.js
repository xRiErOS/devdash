// server/lib/memoryDb.js
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { randomUUID } from 'crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// DD-230: memory.db is a Mac-local developer convenience (vault memory store).
// In containerised deployments the file is absent — refuse to crash the API,
// route handlers fall back to a 503 via assertMemDb() instead.
const MEMORY_DB_PATH = process.env.MEMORY_DB_PATH || path.join(os.homedir(), '.claude/memory.db')

let memDb = null
let memDbError = null
try {
  fs.mkdirSync(path.dirname(MEMORY_DB_PATH), { recursive: true })
  memDb = new Database(MEMORY_DB_PATH)
  memDb.pragma('journal_mode = WAL')
  sqliteVec.load(memDb)
} catch (err) {
  memDbError = err
  console.warn(`[memoryDb] disabled — ${MEMORY_DB_PATH}: ${err.message}`)
}

export function isMemoryDbAvailable() {
  return memDb !== null
}

export function memoryDbStatus() {
  return { available: memDb !== null, path: MEMORY_DB_PATH, error: memDbError?.message || null }
}

function assertMemDb() {
  if (!memDb) {
    const err = new Error('MEMORY_DB_UNAVAILABLE')
    err.code = 'MEMORY_DB_UNAVAILABLE'
    err.detail = memDbError?.message
    throw err
  }
  return memDb
}

process.on('exit', () => {
  try { memDb?.close() } catch {}
})

// ---- Lesen ----

export function listMemories({ q, domain, area, wichtigkeit, schlagwort, page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit
  const conditions = []
  const params = []

  if (q) {
    conditions.push("m.text LIKE ?")
    params.push(`%${q}%`)
  }
  if (domain) {
    conditions.push("m.domain = ?")
    params.push(domain)
  }
  if (area) {
    conditions.push("m.area LIKE ?")
    params.push(`%${area}%`)
  }
  if (wichtigkeit) {
    conditions.push("m.wichtigkeit = ?")
    params.push(wichtigkeit)
  }
  if (schlagwort) {
    conditions.push("m.schlagwoerter LIKE ?")
    params.push(`%${schlagwort}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const total = assertMemDb().prepare(`SELECT COUNT(*) AS n FROM memories m ${where}`).get(...params).n
  const memories = assertMemDb().prepare(
    `SELECT id, text, domain, area, wichtigkeit, schlagwoerter, quelle_typ, quelle, created_at, updated_at
     FROM memories m ${where}
     ORDER BY m.updated_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset)

  return { memories, total, page, pages: Math.ceil(total / limit) }
}

export function getMemory(id) {
  return assertMemDb().prepare(
    `SELECT id, text, domain, area, area_sek, wichtigkeit, schlagwoerter, quelle_typ, quelle, created_at, updated_at
     FROM memories WHERE id = ?`
  ).get(id) || null
}

// ---- Schreiben ----

export function insertMemory(data, embeddingBytes) {
  const id = randomUUID()
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const insertFn = assertMemDb().transaction(() => {
    assertMemDb().prepare(`
      INSERT INTO memories (id, text, domain, area, wichtigkeit, schlagwoerter, typ, quelle_typ, quelle, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.text,
      data.domain,
      data.area,
      data.wichtigkeit || 'Wichtig',
      data.schlagwoerter ?? '',
      data.typ || 'dauerhaft',
      'bestätigt',
      'devd-memory-ui',
      now,
      now
    )
    if (embeddingBytes) {
      assertMemDb().prepare(
        'INSERT INTO memory_vec(memory_id, embedding) VALUES (?, ?)'
      ).run(id, embeddingBytes)
    }
  })

  insertFn()
  return getMemory(id)
}

export function updateMemory(id, data, embeddingBytes) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const existing = getMemory(id)
  if (!existing) return null

  const updateFn = assertMemDb().transaction(() => {
    assertMemDb().prepare(`
      UPDATE memories SET
        text = ?,
        domain = ?,
        area = ?,
        wichtigkeit = ?,
        schlagwoerter = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      data.text ?? existing.text,
      data.domain ?? existing.domain,
      data.area ?? existing.area,
      data.wichtigkeit ?? existing.wichtigkeit,
      data.schlagwoerter === undefined ? existing.schlagwoerter : (data.schlagwoerter ?? ''),
      now,
      id
    )
    if (embeddingBytes) {
      assertMemDb().prepare('DELETE FROM memory_vec WHERE memory_id = ?').run(id)
      assertMemDb().prepare('INSERT INTO memory_vec(memory_id, embedding) VALUES (?, ?)').run(id, embeddingBytes)
    }
  })

  updateFn()
  return getMemory(id)
}

export function deleteMemory(id) {
  const deleteFn = assertMemDb().transaction(() => {
    assertMemDb().prepare('DELETE FROM memory_vec WHERE memory_id = ?').run(id)
    assertMemDb().prepare('DELETE FROM memories WHERE id = ?').run(id)
  })
  deleteFn()
}
