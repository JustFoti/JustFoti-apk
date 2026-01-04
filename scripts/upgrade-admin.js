#!/usr/bin/env node
/**
 * Upgrade Admin User to Administrator Role
 * 
 * This script upgrades an existing admin user to have administrator privileges.
 * For local SQLite development only.
 * 
 * For D1 (production), use wrangler d1 execute.
 * 
 * Usage: node scripts/upgrade-admin.js <username>
 */

require('dotenv').config({ path: '.env.local' });

async function upgradeAdmin(username) {
  if (!username) {
    console.error('❌ Usage: node scripts/upgrade-admin.js <username>');
    console.error('   Example: node scripts/upgrade-admin.js vynx');
    process.exit(1);
  }

  console.log('\n🔧 Admin User Upgrade Tool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📝 Username: ${username}`);
  console.log('📊 Database: SQLite (local development)');
  console.log('');

  try {
    // Use SQLite for local development
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'server', 'db', 'analytics.db');
    
    const db = new Database(dbPath);
    
    // Check if admin exists
    const existing = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    
    if (!existing) {
      console.error(`❌ Admin user '${username}' not found`);
      console.log('\n💡 Available commands:');
      console.log('   - List admins: node scripts/list-admins.js');
      console.log('   - Create admin: node scripts/create-admin.js <username> <password>');
      db.close();
      process.exit(1);
    }

    console.log(`✓ Found admin user '${username}'`);
    console.log('🔧 Upgrading to administrator role...');
    
    // Update user with administrator role and permissions
    db.prepare(`
      UPDATE admin_users 
      SET 
        role = 'super_admin',
        permissions = '["read", "write", "admin", "super_admin"]',
        specific_permissions = '["analytics_view", "analytics_export", "content_moderation", "bot_detection", "user_management", "system_settings", "audit_logs", "user_data_access", "system_health"]'
      WHERE username = ?
    `).run(username);
    
    db.close();
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ User '${username}' upgraded to Super Administrator`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('');
    console.log('🎉 Permissions granted:');
    console.log('   • Super Admin Role');
    console.log('   • All Permission Levels (read, write, admin, super_admin)');
    console.log('   • All Functionality Categories:');
    console.log('     - Analytics View & Export');
    console.log('     - Content Moderation');
    console.log('     - Bot Detection');
    console.log('     - User Management');
    console.log('     - System Settings');
    console.log('     - Audit Logs');
    console.log('     - User Data Access');
    console.log('     - System Health');
    console.log('');
    console.log('🔄 Please refresh your admin panel to see the changes');
    console.log('');
    console.log('ℹ️  For D1 (production), use wrangler d1 execute with similar SQL');
    console.log('');

  } catch (error) {
    console.error('❌ Error upgrading admin user:', error.message);
    
    if (error.message.includes('ENOENT') || error.message.includes('no such table')) {
      console.log('\n💡 Database may not be initialized. Run:');
      console.log('   npm run analytics:init');
    }
    
    process.exit(1);
  }
}

// Get command line arguments
const [,, username] = process.argv;
upgradeAdmin(username);
