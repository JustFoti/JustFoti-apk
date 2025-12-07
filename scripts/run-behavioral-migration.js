// Run this script to add behavioral tracking columns to user_activity table
// Usage: node scripts/run-behavioral-migration.js

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Adding behavioral tracking columns to user_activity table...');
  
  try {
    // Add columns one by one to handle cases where some already exist
    const columns = [
      { name: 'mouse_entropy_avg', type: 'REAL DEFAULT 0' },
      { name: 'total_mouse_samples', type: 'INTEGER DEFAULT 0' },
      { name: 'total_scroll_samples', type: 'INTEGER DEFAULT 0' },
      { name: 'human_score', type: 'REAL DEFAULT 50' },
      { name: 'last_validation_score', type: 'REAL DEFAULT 0' },
    ];

    for (const col of columns) {
      try {
        await sql`ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS ${sql.unsafe(col.name)} ${sql.unsafe(col.type)}`;
        console.log(`✓ Added column: ${col.name}`);
      } catch (err) {
        if (err.message?.includes('already exists')) {
          console.log(`- Column ${col.name} already exists`);
        } else {
          console.error(`✗ Error adding ${col.name}:`, err.message);
        }
      }
    }

    // Create index
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_human_score ON user_activity(human_score)`;
      console.log('✓ Created index on human_score');
    } catch (err) {
      console.log('- Index may already exist:', err.message);
    }

    console.log('\n✅ Behavioral columns migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();
