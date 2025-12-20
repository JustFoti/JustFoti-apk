-- Add columns for storing admin responses to feedback
-- Run this migration to enable the feedback response feature

-- Add admin_response column to store the response text
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_response TEXT;

-- Add responded_at timestamp
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Add responded_by to track which admin responded
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_by VARCHAR(100);

-- Add comment
COMMENT ON COLUMN feedback.admin_response IS 'Admin response message sent to user';
COMMENT ON COLUMN feedback.responded_at IS 'Timestamp when admin responded';
COMMENT ON COLUMN feedback.responded_by IS 'Username of admin who responded';
