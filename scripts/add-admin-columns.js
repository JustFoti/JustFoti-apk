#!/usr/bin/env node
/**
 * Add Missing Admin Columns
 * 
 * This script adds the role and permissions columns to the admin_users table.
 * For local SQLite development only.
 * 
 * For D1 (production), the schema is managed via init-d1-admin.sql
 */

require('dotenv').config({ path: '.env.local' });

async function addAdminColumns() {
  console.log('\n🔧 Adding Admin Columns Tool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Database: SQLite (local development)');
  console.log('');
  console.log('ℹ️  For D1 (production), columns are managed via:');
  console.log('   npm run d1:init');
  console.log('');

  try {
    // Use SQLite for local development
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'server', 'db', 'analytics.db');
    
    const db = new Database(dbPath);
    
    console.log('🔍 Checking existing columns...');
    
    // Get existing columns
    const tableInfo = db.prepare("PRAGMA table_info(admin_users)").all();
    const existingColumns = tableInfo.map(c => c.name);
    console.log(`✓ Existing columns: ${existingColumns.join(', ') || 'none'}`);
    
    // Add role column if missing
    if (!existingColumns.includes('role')) {
      console.log('➕ Adding role column...');
      db.prepare("ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'viewer'").run();
      console.log('✅ Role column added');
    } else {
      console.log('✅ Role column already exists');
    }
    
    // Add permissions column if missing
    if (!existingColumns.includes('permissions')) {
      console.log('➕ Adding permissions column...');
      db.prepare("ALTER TABLE admin_users ADD COLUMN permissions TEXT DEFAULT '[\"read\"]'").run();
      console.log('✅ Permissions column added');
    } else {
      console.log('✅ Permissions column already exists');
    }
    
    // Add specific_permissions column if missing
    if (!existingColumns.includes('specific_permissions')) {
      console.log('➕ Adding specific_permissions column...');
      db.prepare("ALTER TABLE admin_users ADD COLUMN specific_permissions TEXT DEFAULT '[\"analytics_view\"]'").run();
      console.log('✅ Specific permissions column added');
    } else {
      console.log('✅ Specific permissions column already exists');
    }
    
    db.close();
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Admin columns setup completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('💡 Now run: node scripts/upgrade-admin.js <username>');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up admin columns:', error.message);
    process.exit(1);
  }
}

addAdminColumns();
