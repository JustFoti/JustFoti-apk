/**
 * Create Admin User Script
 * Usage: bun run scripts/create-admin.ts <username> <password>
 */

import { getDB } from '../app/lib/db/connection';
import { queries } from '../app/lib/db/queries';
import { hashPassword, validateUsername, validatePassword } from '../app/lib/utils/auth';

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: bun run scripts/create-admin.ts <username> <password>');
    process.exit(1);
  }
  
  const [username, password] = args;
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    console.error('Invalid username:', usernameValidation.error);
    process.exit(1);
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.error('Invalid password:', passwordValidation.error);
    process.exit(1);
  }
  
  try {
    // Initialize database connection
    const db = getDB();
    await db.initialize();
    
    // Check if admin already exists
    if (queries.admin.adminExists(username)) {
      console.error(`Admin user "${username}" already exists`);
      process.exit(1);
    }
    
    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);
    
    // Create admin user
    const id = crypto.randomUUID();
    queries.admin.createAdmin(id, username, passwordHash);
    
    console.log('✅ Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`User ID: ${id}`);
    console.log('\nYou can now login at: http://localhost:3000/admin/login');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
