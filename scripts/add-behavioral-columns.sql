-- Add behavioral tracking columns to user_activity table
-- Run this migration to enable mouse entropy tracking

-- For PostgreSQL (Neon)
ALTER TABLE user_activity 
ADD COLUMN IF NOT EXISTS mouse_entropy_avg REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mouse_samples INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_scroll_samples INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS human_score REAL DEFAULT 50,
ADD COLUMN IF NOT EXISTS last_validation_score REAL DEFAULT 0;

-- Create index for human score queries
CREATE INDEX IF NOT EXISTS idx_user_activity_human_score ON user_activity(human_score);

-- For SQLite (local development), run these separately:
-- ALTER TABLE user_activity ADD COLUMN mouse_entropy_avg REAL DEFAULT 0;
-- ALTER TABLE user_activity ADD COLUMN total_mouse_samples INTEGER DEFAULT 0;
-- ALTER TABLE user_activity ADD COLUMN total_scroll_samples INTEGER DEFAULT 0;
-- ALTER TABLE user_activity ADD COLUMN human_score REAL DEFAULT 50;
-- ALTER TABLE user_activity ADD COLUMN last_validation_score REAL DEFAULT 0;
