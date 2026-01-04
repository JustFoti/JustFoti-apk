#!/usr/bin/env node
/**
 * Reset or Create Admin User in D1 Database
 * 
 * Usage:
 *   node scripts/reset-d1-admin.js <username> <password>
 *   node scripts/reset-d1-admin.js admin MyNewPassword123
 * 
 * This script:
 *   1. Generates a bcrypt hash of the password
 *   2. Outputs the SQL command to run via wrangler
 *   3. Optionally runs it directly if --execute flag is passed
 */

const bcrypt = require('bcryptjs');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node scripts/reset-d1-admin.js <username> <password> [--execute]');
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
  
  console.log(`\n🔐 Generating password hash for user: ${username}`);
  
  // Generate bcrypt hash (same as the app uses)
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  console.log(`✓ Password hash generated\n`);
  
  // SQL to upsert the admin user
  const sql = `INSERT INTO admin_users (username, password_hash, role) 
VALUES ('${username}', '${passwordHash}', 'super_admin')
ON CONFLICT(username) DO UPDATE SET 
  password_hash = '${passwordHash}',
  last_login = NULL;`;
  
  console.log('📋 SQL Command:');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('');
  
  if (shouldExecute) {
    console.log('🚀 Executing on D1 (production)...\n');
    
    const { execSync } = require('child_process');
    try {
      // Write SQL to temp file to avoid shell escaping issues
      const fs = require('fs');
      const tempFile = 'scripts/.temp-admin-reset.sql';
      fs.writeFileSync(tempFile, sql);
      
      const result = execSync(`npx wrangler d1 execute flyx-admin-db --remote --file=${tempFile}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        input: 'Y\n'
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      console.log('✅ Admin user created/updated successfully!\n');
      console.log('You can now login with:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
    } catch (error) {
      console.error('❌ Failed to execute:', error.message);
      console.log('\nTry running manually:');
      console.log(`npx wrangler d1 execute flyx-admin-db --command="${sql.replace(/\n/g, ' ')}"`);
      process.exit(1);
    }
  } else {
    console.log('To apply this change to D1, run:');
    console.log('');
    console.log(`npx wrangler d1 execute flyx-admin-db --command="${sql.replace(/\n/g, ' ')}"`);
    console.log('');
    console.log('Or run this script with --execute flag:');
    console.log(`node scripts/reset-d1-admin.js ${username} ${password} --execute`);
  }
}

main().catch(console.error);
