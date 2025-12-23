-- Flyx Sync Worker D1 Schema
-- Run: npx wrangler d1 execute flyx-sync-db --file=schema.sql

CREATE TABLE IF NOT EXISTS sync_accounts (
  id TEXT PRIMARY KEY,
  code_hash TEXT UNIQUE NOT NULL,
  sync_data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_sync_at INTEGER NOT NULL,
  device_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sync_accounts_hash ON sync_accounts(code_hash);
CREATE INDEX IF NOT EXISTS idx_sync_accounts_updated ON sync_accounts(updated_at);
