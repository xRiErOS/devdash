// ProjectPages T-be2 (D-E): SOP-Collections — benannte Gruppen von SOPs + Markdown-Export.
// Pure Funktionen ohne Express (Reuse-Pattern aus sops.js / sstdSlots.js). Daten: sop_collections
// + sop_collection_items (Migration 061). Global wie sops (KEIN project_id, SOP-D02).
// Speist SopCollectionsView (S3): collections[{id, name, sopKeys}] + Detail/Export.

import { SopError, SOP_KEY_RE, TITLE_MAX } from './sops.js'

const COLLECTION_KEY_RE = SOP_KEY_RE // gleiche Konvention [a-z0-9-]

function validateCollectionKey(raw) {
  if (typeof raw !== 'string' || !COLLECTION_KEY_RE.test(raw)) {
    throw new SopError('collection_key muss aus [a-z0-9-] bestehen', { code: 'COLLECTION_KEY_INVALID', field: 'collection_key' })
  }
  return raw
}

function validateName(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new SopError('name darf nicht leer sein', { code: 'NAME_REQUIRED', field: 'name' })
  }
  if (raw.length > TITLE_MAX) {
    throw new SopError(`name darf max ${TITLE_MAX} Zeichen lang sein`, { code: 'NAME_TOO_LONG', field: 'name' })
  }
  return raw
}

function getCollectionRow(db, collectionKey) {
  return db.prepare(
    'SELECT id, collection_key, name, description, created_at, updated_at FROM sop_collections WHERE collection_key = ?',
  ).get(collectionKey)
}

// Geordnete sop_keys einer Collection (via position).
function sopKeysOf(db, collectionId) {
  return db.prepare(`
    SELECT s.sop_key FROM sop_collection_items i
    JOIN sops s ON s.id = i.sop_id
    WHERE i.collection_id = ?
    ORDER BY i.position, i.id
  `).all(collectionId).map(r => r.sop_key)
}

export function createCollection(db, { collection_key, name, description = '' } = {}) {
  validateCollectionKey(collection_key)
  validateName(name)
  const desc = typeof description === 'string' ? description : ''
  try {
    const result = db.prepare(
      'INSERT INTO sop_collections (collection_key, name, description) VALUES (?, ?, ?)',
    ).run(collection_key, name, desc)
    return getCollectionRow(db, collection_key) ?? { id: Number(result.lastInsertRowid) }
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new SopError(`Collection '${collection_key}' existiert bereits`, { statusCode: 409, code: 'COLLECTION_EXISTS', field: 'collection_key' })
    }
    throw err
  }
}

// Liste = Metadaten + sopKeys + sop_count (ohne SOP-Inhalt, bandbreitenschonend).
export function listCollections(db) {
  const rows = db.prepare(
    'SELECT id, collection_key, name, description, created_at, updated_at FROM sop_collections ORDER BY collection_key',
  ).all()
  for (const row of rows) {
    row.sopKeys = sopKeysOf(db, row.id)
    row.sop_count = row.sopKeys.length
  }
  return rows
}

// Detail mit vollen SOP-Inhalten (geordnet). null wenn Collection fehlt.
export function getCollection(db, collectionKey) {
  const row = getCollectionRow(db, collectionKey)
  if (!row) return null
  row.sops = db.prepare(`
    SELECT s.id, s.sop_key, s.title, s.content, s.source_path, s.created_at, s.updated_at
    FROM sop_collection_items i
    JOIN sops s ON s.id = i.sop_id
    WHERE i.collection_id = ?
    ORDER BY i.position, i.id
  `).all(row.id)
  return row
}

// Mitgliedschaft setzen (Replace, geordnet wie übergeben). Unbekannter sop_key / Collection → Fehler.
export function setCollectionItems(db, collectionKey, sopKeys = []) {
  const row = getCollectionRow(db, collectionKey)
  if (!row) {
    throw new SopError(`Collection '${collectionKey}' nicht gefunden`, { statusCode: 404, code: 'COLLECTION_NOT_FOUND', field: 'collection_key' })
  }
  if (!Array.isArray(sopKeys)) {
    throw new SopError('sopKeys muss ein Array sein', { code: 'SOP_KEYS_TYPE', field: 'sopKeys' })
  }
  const ids = sopKeys.map(key => {
    const sop = db.prepare('SELECT id FROM sops WHERE sop_key = ?').get(key)
    if (!sop) {
      throw new SopError(`SOP '${key}' nicht gefunden`, { statusCode: 404, code: 'SOP_NOT_FOUND', field: 'sop_key' })
    }
    return Number(sop.id)
  })
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sop_collection_items WHERE collection_id = ?').run(row.id)
    const ins = db.prepare('INSERT INTO sop_collection_items (collection_id, sop_id, position) VALUES (?, ?, ?)')
    ids.forEach((sopId, pos) => ins.run(row.id, sopId, pos))
    db.prepare("UPDATE sop_collections SET updated_at = datetime('now') WHERE id = ?").run(row.id)
  })
  tx()
  return sopKeysOf(db, row.id)
}

// Markdown-Bundle aller Member-SOPs (geordnet). null wenn Collection fehlt.
export function exportCollection(db, collectionKey) {
  const c = getCollection(db, collectionKey)
  if (!c) return null
  const parts = [`# ${c.name}`]
  if (c.description) parts.push('', c.description)
  for (const sop of c.sops) {
    parts.push('', `## ${sop.title} (\`${sop.sop_key}\`)`, '', sop.content || '')
  }
  return parts.join('\n') + '\n'
}
