#!/usr/bin/env node
/**
 * Reset Admin Password Script
 * 
 * This script forcefully resets an admin user's password.
 * For local SQLite development only.
 * 
 * For D1 (production), use wrangler d1 execute:
 *   npx wrangler d1 execute flyx-admin-db --command "UPDATE admin_users SET password_hash='<hash>' WHERE username='<user>'"
 * 
 * Usage: node scripts/reset-admin-password.js <username> <new-password>
 */

require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');

async function resetPassword(username, newPassword) {
  if (!username || !newPassword) {
    console.error('❌ Usage: node scripts/reset-admin-password.js <username> <new-password>');
    console.error('   Example: node scripts/reset-admin-password.js admin myNewPassword123');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  console.log('\n🔐 Admin Password Reset Tool');
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
    console.log('🔒 Hashing new password...');
    
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(passwordHash, username);
    db.close();
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Password reset successfully for '${username}'`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('');
    console.log('🔑 You can now login with the new password at /admin');
    console.log('');
    console.log('ℹ️  For D1 (production), use:');
    console.log(`   npx wrangler d1 execute flyx-admin-db --command "UPDATE admin_users SET password_hash='${passwordHash}' WHERE username='${username}'"`);
    console.log('');

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    
    if (error.message.includes('ENOENT') || error.message.includes('no such table')) {
      console.log('\n💡 Database may not be initialized. Run:');
      console.log('   npm run analytics:init');
    }
    
    process.exit(1);
  }
}

// Get command line arguments
const [,, username, newPassword] = process.argv;
resetPassword(username, newPassword);
