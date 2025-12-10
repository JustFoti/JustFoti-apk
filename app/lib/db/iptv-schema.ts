/**
 * IPTV Stalker Account & Channel Mapping Schema
 * 
 * Tables for managing IPTV Stalker portal accounts and mapping
 * LiveTV channels to Stalker provider channels with load balancing.
 */

// PostgreSQL schema for IPTV accounts
export const CREATE_IPTV_ACCOUNTS_TABLE_PG = `
CREATE TABLE IF NOT EXISTS iptv_accounts (
  id TEXT PRIMARY KEY,
  portal_url TEXT NOT NULL,
  mac_address TEXT NOT NULL,
  name TEXT,
  channels_count INTEGER DEFAULT 0,
  stream_limit INTEGER DEFAULT 1,
  active_streams INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_tested BIGINT,
  last_used BIGINT,
  total_usage_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  priority INTEGER DEFAULT 0,
  created_at BIGINT,
  updated_at BIGINT,
  UNIQUE(portal_url, mac_address)
)`;

// PostgreSQL schema for channel mappings
export const CREATE_CHANNEL_MAPPINGS_TABLE_PG = `
CREATE TABLE IF NOT EXISTS channel_mappings (
  id TEXT PRIMARY KEY,
  our_channel_id TEXT NOT NULL,
  our_channel_name TEXT NOT NULL,
  stalker_account_id TEXT NOT NULL,
  stalker_channel_id TEXT NOT NULL,
  stalker_channel_name TEXT NOT NULL,
  stalker_channel_cmd TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_used BIGINT,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at BIGINT,
  updated_at BIGINT,
  FOREIGN KEY (stalker_account_id) REFERENCES iptv_accounts(id) ON DELETE CASCADE
)`;

// PostgreSQL schema for active stream sessions (for tracking concurrent usage)
export const CREATE_STREAM_SESSIONS_TABLE_PG = `
CREATE TABLE IF NOT EXISTS iptv_stream_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  channel_mapping_id TEXT,
  user_session_id TEXT NOT NULL,
  stream_url TEXT,
  started_at BIGINT NOT NULL,
  last_heartbeat BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at BIGINT,
  FOREIGN KEY (account_id) REFERENCES iptv_accounts(id) ON DELETE CASCADE
)`;

// SQLite schema for IPTV accounts
export const CREATE_IPTV_ACCOUNTS_TABLE_SQLITE = `
CREATE TABLE IF NOT EXISTS iptv_accounts (
  id TEXT PRIMARY KEY,
  portal_url TEXT NOT NULL,
  mac_address TEXT NOT NULL,
  name TEXT,
  channels_count INTEGER DEFAULT 0,
  stream_limit INTEGER DEFAULT 1,
  active_streams INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_tested INTEGER,
  last_used INTEGER,
  total_usage_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  priority INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT(strftime('%s', 'now')),
  updated_at INTEGER DEFAULT(strftime('%s', 'now')),
  UNIQUE(portal_url, mac_address)
)`;

// SQLite schema for channel mappings
export const CREATE_CHANNEL_MAPPINGS_TABLE_SQLITE = `
CREATE TABLE IF NOT EXISTS channel_mappings (
  id TEXT PRIMARY KEY,
  our_channel_id TEXT NOT NULL,
  our_channel_name TEXT NOT NULL,
  stalker_account_id TEXT NOT NULL,
  stalker_channel_id TEXT NOT NULL,
  stalker_channel_name TEXT NOT NULL,
  stalker_channel_cmd TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_used INTEGER,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT(strftime('%s', 'now')),
  updated_at INTEGER DEFAULT(strftime('%s', 'now')),
  FOREIGN KEY (stalker_account_id) REFERENCES iptv_accounts(id) ON DELETE CASCADE
)`;

// SQLite schema for active stream sessions
export const CREATE_STREAM_SESSIONS_TABLE_SQLITE = `
CREATE TABLE IF NOT EXISTS iptv_stream_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  channel_mapping_id TEXT,
  user_session_id TEXT NOT NULL,
  stream_url TEXT,
  started_at INTEGER NOT NULL,
  last_heartbeat INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT(strftime('%s', 'now')),
  FOREIGN KEY (account_id) REFERENCES iptv_accounts(id) ON DELETE CASCADE
)`;

// Indexes for PostgreSQL
export const IPTV_INDEXES_PG = [
  'CREATE INDEX IF NOT EXISTS idx_iptv_accounts_status ON iptv_accounts(status)',
  'CREATE INDEX IF NOT EXISTS idx_iptv_accounts_active_streams ON iptv_accounts(active_streams)',
  'CREATE INDEX IF NOT EXISTS idx_iptv_accounts_priority ON iptv_accounts(priority DESC)',
  'CREATE INDEX IF NOT EXISTS idx_channel_mappings_our_channel ON channel_mappings(our_channel_id)',
  'CREATE INDEX IF NOT EXISTS idx_channel_mappings_account ON channel_mappings(stalker_account_id)',
  'CREATE INDEX IF NOT EXISTS idx_channel_mappings_active ON channel_mappings(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_stream_sessions_account ON iptv_stream_sessions(account_id)',
  'CREATE INDEX IF NOT EXISTS idx_stream_sessions_active ON iptv_stream_sessions(is_active, last_heartbeat)',
];

// Indexes for SQLite
export const IPTV_INDEXES_SQLITE = [
  'CREATE INDEX IF NOT EXISTS idx_iptv_accounts_status ON iptv_accounts(status)',
  'CREATE INDEX IF NOT EXISTS idx_iptv_accounts_active_streams ON iptv_accounts(active_streams)',
  'CREATE INDEX IF NOT EXISTS idx_iptv_accounts_priority ON iptv_accounts(priority DESC)',
  'CREATE INDEX IF NOT EXISTS idx_channel_mappings_our_channel ON channel_mappings(our_channel_id)',
  'CREATE INDEX IF NOT EXISTS idx_channel_mappings_account ON channel_mappings(stalker_account_id)',
  'CREATE INDEX IF NOT EXISTS idx_channel_mappings_active ON channel_mappings(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_stream_sessions_account ON iptv_stream_sessions(account_id)',
  'CREATE INDEX IF NOT EXISTS idx_stream_sessions_active ON iptv_stream_sessions(is_active, last_heartbeat)',
];

// Table names
export const IPTV_TABLES = {
  ACCOUNTS: 'iptv_accounts',
  MAPPINGS: 'channel_mappings',
  SESSIONS: 'iptv_stream_sessions',
} as const;

// Types
export interface IPTVAccount {
  id: string;
  portal_url: string;
  mac_address: string;
  name?: string;
  channels_count: number;
  stream_limit: number;
  active_streams: number;
  status: 'active' | 'inactive' | 'error';
  last_tested?: number;
  last_used?: number;
  total_usage_count: number;
  error_count: number;
  last_error?: string;
  priority: number;
  created_at: number;
  updated_at: number;
}

export interface ChannelMapping {
  id: string;
  our_channel_id: string;
  our_channel_name: string;
  stalker_account_id: string;
  stalker_channel_id: string;
  stalker_channel_name: string;
  stalker_channel_cmd: string;
  priority: number;
  is_active: boolean;
  last_used?: number;
  success_count: number;
  failure_count: number;
  created_at: number;
  updated_at: number;
}

export interface StreamSession {
  id: string;
  account_id: string;
  channel_mapping_id?: string;
  user_session_id: string;
  stream_url?: string;
  started_at: number;
  last_heartbeat: number;
  is_active: boolean;
  created_at: number;
}
