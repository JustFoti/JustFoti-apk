#!/usr/bin/env node
/**
 * Reset or Create Admin User in D1 Database
 * 
 * Usage:
 *   node scripts/reset-d1-admin.js <username> <password> [--execute] [--bcrypt]
 * 
 * Options:
 *   --execute   Run the SQL directly on D1 (requires wrangler)
 *   --bcrypt    Use legacy bcrypt hash (NOT recommended for Cloudflare Workers)
 * 
 * Examples:
 *   node scripts/reset-d1-admin.js admin MyNewPassword123
 *   node scripts/reset-d1-admin.js admin MyNewPassword123 --execute
 *   node scripts/reset-d1-admin.js admin MyNewPassword123 --execute --bcrypt
 * 
 * Database: flyx-admin-db (b7875a59-3876-4223-9c3d-7644c16f44a5)
 * 
 * NOTE: By default, this uses Web Crypto PBKDF2 hashing which is compatible
 * with Cloudflare Workers. Only use --bcrypt for legacy compatibility.
 */

const crypto = require('crypto');

const DATABASE_NAME = 'flyx-admin-db';

/**
 * Hash password using PBKDF2 (Web Crypto compatible format)
 * This matches the format used in app/lib/utils/admin-auth.ts
 */
async function hashPasswordPBKDF2(password) {
  return new Promise((resolve, reject) => {
    // Generate 16 bytes of random salt
    const salt = crypto.randomBytes(16);
    
    // Derive 32-byte key using PBKDF2 with SHA-256
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Combine salt and hash (same format as admin-auth.ts)
      const combined = Buffer.concat([salt, derivedKey]);
      
      // Return base64 encoded string
      resolve(combined.toString('base64'));
    });
  });
}

/**
 * Hash password using bcrypt (legacy, may not work in CF Workers)
 */
async function hashPasswordBcrypt(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, 10);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node scripts/reset-d1-admin.js <username> <password> [--execute] [--bcrypt]');
    console.log('');
    console.log('Options:');
    console.log('  --execute   Run the SQL directly on D1 (requires wrangler)');
    console.log('  --bcrypt    Use legacy bcrypt hash (NOT recommended for CF Workers)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/reset-d1-admin.js admin MySecurePassword123');
    console.log('  node scripts/reset-d1-admin.js admin MySecurePassword123 --execute');
    console.log('');
    console.log('Without --execute, it will output the SQL command to run manually.');
    process.exit(1);
  }
  
  const username = args[0];
  const password = args[1];
  const shouldExecute = args.includes('--execute');
  const useBcrypt = args.includes('--bcrypt');
  
  console.log(`\n🔐 Generating password hash for user: ${username}`);
  console.log(`📦 Target database: ${DATABASE_NAME}`);
  console.log(`🔑 Hash type: ${useBcrypt ? 'bcrypt (legacy)' : 'PBKDF2 (Web Crypto compatible)'}`);
  
  let passwordHash;
  
  if (useBcrypt) {
    console.log('\n⚠️  WARNING: bcrypt may not work in Cloudflare Workers!');
    console.log('   Consider using PBKDF2 (default) instead.\n');
    passwordHash = await hashPasswordBcrypt(password);
  } else {
    passwordHash = await hashPasswordPBKDF2(password);
  }
  
  console.log(`✓ Password hash generated\n`);
  
  // First, ensure the table exists
  const createTableSql = `CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  permissions TEXT,
  specific_permissions TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  last_login INTEGER
);`;

  // SQL to upsert the admin user
  const upsertSql = `INSERT INTO admin_users (username, password_hash, role, created_at) 
VALUES ('${username}', '${passwordHash}', 'super_admin', ${Date.now()})
ON CONFLICT(username) DO UPDATE SET 
  password_hash = '${passwordHash}',
  last_login = NULL;`;
  
  console.log('📋 SQL Commands:');
  console.log('─'.repeat(60));
  console.log('-- Create table if not exists:');
  console.log(createTableSql);
  console.log('');
  console.log('-- Upsert admin user:');
  console.log(upsertSql);
  console.log('─'.repeat(60));
  console.log('');
  
  if (shouldExecute) {
    console.log('🚀 Executing on D1 (production)...\n');
    
    const { execSync } = require('child_process');
    const fs = require('fs');
    
    try {
      // Write SQL to temp file to avoid shell escaping issues
      const tempFile = 'scripts/.temp-admin-reset.sql';
      fs.writeFileSync(tempFile, createTableSql + '\n\n' + upsertSql);
      
      console.log('Step 1: Creating table and upserting user...');
      execSync(`npx wrangler d1 execute ${DATABASE_NAME} --remote --file=${tempFile}`, {
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      console.log('\n✅ Admin user created/updated successfully!\n');
      console.log('You can now login with:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log('');
      console.log('Login URL: https://tv.vynx.cc/admin');
    } catch (error) {
      console.error('\n❌ Failed to execute:', error.message);
      console.log('\nTry running manually with wrangler:');
      console.log(`npx wrangler d1 execute ${DATABASE_NAME} --remote --command="<SQL>"`);
      process.exit(1);
    }
  } else {
    console.log('To apply this change to D1, run:');
    console.log('');
    console.log(`node scripts/reset-d1-admin.js ${username} "${password}" --execute`);
    console.log('');
    console.log('Or manually with wrangler:');
    console.log(`npx wrangler d1 execute ${DATABASE_NAME} --remote --file=<sql_file>`);
  }
}

main().catch(console.error);
