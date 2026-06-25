// DD-258 (T06 M02-S01): DoD-Items CRUD + Reorder.
// D04 (Session 2026-05-22): Backend setzt position = MAX(position)+1 atomar in Transaction.
// Separates /reorder Endpoint für Drag&Drop (UI T09 DD-261).

export function insertDodItem(db, milestoneId, { label, details } = {}) {
  if (!label || !String(label).trim()) {
    const err = new Error('label ist Pflichtfeld')
    err.statusCode = 400
    err.code = 'LABEL_REQUIRED'
    throw err
  }
  const milestoneExists = db.prepare('SELECT 1 FROM milestones WHERE id = ?').get(milestoneId)
  if (!milestoneExists) {
    const err = new Error('Milestone existiert nicht')
    err.statusCode = 404
    err.code = 'MILESTONE_NOT_FOUND'
    throw err
  }

  // details: leerer String / whitespace-only → NULL; sonst trimmen.
  const detailsVal = (details != null && String(details).trim()) ? String(details).trim() : null

  const tx = db.transaction(() => {
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), 0) AS p FROM milestone_dod_items WHERE milestone_id = ?',
    ).get(milestoneId).p
    const position = maxPos + 1
    const result = db.prepare(
      'INSERT INTO milestone_dod_items (milestone_id, label, position, details) VALUES (?, ?, ?, ?)',
    ).run(milestoneId, String(label).trim(), position, detailsVal)
    return { id: Number(result.lastInsertRowid), position }
  })
  return tx()
}

export function patchDodItem(db, itemId, body) {
  const existing = db.prepare('SELECT * FROM milestone_dod_items WHERE id = ?').get(itemId)
  if (!existing) {
    const err = new Error('DoD-Item not found')
    err.statusCode = 404
    err.code = 'NOT_FOUND'
    throw err
  }

  const sets = []
  const vals = []

  if (Object.prototype.hasOwnProperty.call(body, 'label')) {
    if (!body.label || !String(body.label).trim()) {
      const err = new Error('label darf nicht leer sein')
      err.statusCode = 400
      err.code = 'LABEL_BLANK'
      throw err
    }
    sets.push('label = ?')
    vals.push(String(body.label).trim())
  }
  if (Object.prototype.hasOwnProperty.call(body, 'done')) {
    // Finding #14: Coercion für gängige Boolean-Repräsentationen (HTML-Form, JSON, querystring).
    let doneVal = body.done
    if (doneVal === true || doneVal === '1' || doneVal === 1) doneVal = 1
    else if (doneVal === false || doneVal === '0' || doneVal === 0) doneVal = 0
    else {
      const err = new Error('done muss 0, 1, true, false, "0" oder "1" sein')
      err.statusCode = 400
      err.code = 'INVALID_DONE'
      throw err
    }
    sets.push('done = ?')
    vals.push(doneVal)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'details')) {
    // leerer String / whitespace-only / null → NULL (= details löschen).
    const detailsVal = (body.details != null && String(body.details).trim())
      ? String(body.details).trim()
      : null
    sets.push('details = ?')
    vals.push(detailsVal)
  }

  if (sets.length === 0) return existing

  sets.push("updated_at = datetime('now')")
  vals.push(itemId)
  db.prepare(`UPDATE milestone_dod_items SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  return db.prepare('SELECT * FROM milestone_dod_items WHERE id = ?').get(itemId)
}

export function deleteDodItem(db, itemId) {
  const result = db.prepare('DELETE FROM milestone_dod_items WHERE id = ?').run(itemId)
  if (result.changes === 0) {
    const err = new Error('DoD-Item not found')
    err.statusCode = 404
    err.code = 'NOT_FOUND'
    throw err
  }
  return true
}

export function listDodItems(db, milestoneId) {
  return db.prepare(`
    SELECT id, milestone_id, label, done, position, details, created_at, updated_at
    FROM milestone_dod_items
    WHERE milestone_id = ?
    ORDER BY position ASC
  `).all(milestoneId)
}

export function reorderDodItems(db, milestoneId, orderedIds) {
  if (!Array.isArray(orderedIds)) {
    const err = new Error('order muss ein Array sein')
    err.statusCode = 400
    err.code = 'ORDER_NOT_ARRAY'
    throw err
  }

  // Finding #12: Read-current + Validation + UPDATE alles in einer Transaction, um Race-Conditions
  // mit parallelem POST /dod-items zu eliminieren (Multi-Process / Cluster-Safe).
  const tx = db.transaction(() => {
    const current = db.prepare(
      'SELECT id FROM milestone_dod_items WHERE milestone_id = ? ORDER BY position ASC',
    ).all(milestoneId).map(r => r.id)

    if (orderedIds.length !== current.length) {
      const err = new Error(`order muss alle ${current.length} DoD-Items enthalten (geliefert: ${orderedIds.length})`)
      err.statusCode = 400
      err.code = 'PARTIAL_REORDER'
      throw err
    }
    const currentSet = new Set(current)
    for (const id of orderedIds) {
      if (!currentSet.has(id)) {
        const err = new Error(`DoD-Item ${id} gehört nicht zu Milestone ${milestoneId}`)
        err.statusCode = 400
        err.code = 'FOREIGN_ID'
        throw err
      }
    }

    const upd = db.prepare("UPDATE milestone_dod_items SET position = ?, updated_at = datetime('now') WHERE id = ?")
    orderedIds.forEach((id, idx) => upd.run(idx + 1, id))
  })
  tx()
  return listDodItems(db, milestoneId)
}
