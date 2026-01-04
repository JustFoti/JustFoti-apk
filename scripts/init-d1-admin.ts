/**
 * D1 Admin Database Schema Initialization Script
 * 
 * This script creates all necessary tables for the Flyx admin database
 * including admin_users, feedback, bot_detections, metrics_daily, and schema_migrations.
 * 
 * Usage:
 *   npx wrangler d1 execute flyx-admin-db --file=scripts/init-d1-admin.sql
 * 
 * Or run this TypeScript file to generate the SQL:
 *   npx ts-node scripts/init-d1-admin.ts > scripts/init-d1-admin.sql
 */

const schema = `
-- ============================================
-- Flyx Admin Database Schema
-- D1 (SQLite) compatible
-- ============================================

-- Admin users table for authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

-- Daily metrics aggregation table
CREATE TABLE IF NOT EXISTS metrics_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_completion_rate REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date)
);

-- Feedback table for user submissions
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'general', 'content')),
  message TEXT NOT NULL,
  email TEXT,
  url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  screenshot TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'archived')),
  admin_response TEXT,
  responded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Bot detection table for security monitoring
CREATE TABLE IF NOT EXISTS bot_detections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  detection_reasons TEXT NOT NULL,
  status TEXT DEFAULT 'suspected' CHECK (status IN ('suspected', 'confirmed_bot', 'confirmed_human', 'pending_review')),
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Indexes for performance optimization
-- ============================================

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Bot detection indexes
CREATE INDEX IF NOT EXISTS idx_bot_detections_user_id ON bot_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_detections_ip ON bot_detections(ip_address);
CREATE INDEX IF NOT EXISTS idx_bot_detections_confidence ON bot_detections(confidence_score);
CREATE INDEX IF NOT EXISTS idx_bot_detections_status ON bot_detections(status);
CREATE INDEX IF NOT EXISTS idx_bot_detections_created ON bot_detections(created_at);

-- Metrics daily indexes
CREATE INDEX IF NOT EXISTS idx_metrics_daily_date ON metrics_daily(date);

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- ============================================
-- Insert initial schema version
-- ============================================
INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
`;

// Output the schema SQL
console.log(schema);
