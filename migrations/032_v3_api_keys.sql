-- 032_v3_api_keys.sql — DD-251 API-Key-Auth-Chain for Capture-Endpoints
-- Adds api_keys table for M2M authentication via X-API-Key header.
-- key_hash = SHA-256 of plaintext key (format: dd_pat_<32-byte hex>).

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
