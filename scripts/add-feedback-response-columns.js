// Run this script to add response columns to the feedback table
// Usage: node scripts/add-feedback-response-columns.js

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function addResponseColumns() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Adding response columns to feedback table...');
  
  try {
    // Add admin_response column
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_response TEXT`;
    console.log('✓ Added admin_response column');

    // Add responded_at column
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE`;
    console.log('✓ Added responded_at column');

    // Add responded_by column
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_by VARCHAR(100)`;
    console.log('✓ Added responded_by column');

    console.log('\n✅ Feedback response columns added successfully!');
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  }
}

addResponseColumns();
