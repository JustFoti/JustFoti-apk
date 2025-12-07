-- Create feedback table for storing user feedback submissions
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'general', 'content')),
  message TEXT NOT NULL,
  email VARCHAR(255),
  url TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Add comment to table
COMMENT ON TABLE feedback IS 'Stores user feedback submissions from the website';
