import crypto from 'crypto'

const KEY_PREFIX = 'dd_pat_'

export function hashApiKey(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex')
}

export function generateApiKey() {
  return KEY_PREFIX + crypto.randomBytes(32).toString('hex')
}

export function createApiKeyAuth(db) {
  return function apiKeyAuth(req, res, next) {
    const headerKey = req.header ? req.header('X-API-Key') : (req.headers && req.headers['x-api-key'])
    if (!headerKey) return next()

    if (typeof headerKey !== 'string' || !headerKey.startsWith(KEY_PREFIX)) {
      return res.status(401).json({ error: 'INVALID_API_KEY_FORMAT' })
    }

    const hash = hashApiKey(headerKey)
    const row = db.prepare(
      'SELECT user_id, revoked_at FROM api_keys WHERE key_hash = ?'
    ).get(hash)

    if (!row) return res.status(401).json({ error: 'INVALID_API_KEY' })
    if (row.revoked_at) return res.status(401).json({ error: 'REVOKED_API_KEY' })

    req.user = { username: row.user_id, source: 'api-key' }
    db.prepare(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_hash = ?'
    ).run(hash)
    next()
  }
}
