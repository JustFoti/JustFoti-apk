// Run this script to create the feedback table
// Usage: node scripts/create-feedback-table.js

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function createFeedbackTable() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Creating feedback table...');
  
  try {
    await sql`
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
      )
    `;
    console.log('✓ Table created');

    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type)`;
    console.log('✓ Index on type created');

    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)`;
    console.log('✓ Index on status created');

    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC)`;
    console.log('✓ Index on created_at created');

    console.log('\n✅ Feedback table setup complete!');
  } catch (error) {
    console.error('Error creating feedback table:', error);
    process.exit(1);
  }
}

createFeedbackTable();
