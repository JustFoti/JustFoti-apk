/**
 * Create Admin User Script for Neon Database
 * Run with: node scripts/create-admin.js <username> <password>
 * Or with Bun: bun scripts/create-admin.js <username> <password>
 */

require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');

// Generate a simple ID function
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function createAdmin(username, password) {
  if (!username || !password) {
    console.error('❌ Usage: node scripts/create-admin.js <username> <password>');
    console.error('   Example: node scripts/create-admin.js admin mySecurePassword123');
    process.exit(1);
  }

  console.log('🚀 Starting admin user creation...');
  console.log(`📝 Username: ${username}`);
  console.log(`🔐 Password: ${'*'.repeat(password.length)}`);

  try {
    // Check environment
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment variables');
      console.error('   Make sure .env.local file exists with DATABASE_URL set');
      process.exit(1);
    }

    const isNeonDB = process.env.DATABASE_URL.includes('neon.tech');
    console.log(`🗄️  Database type: ${isNeonDB ? 'Neon PostgreSQL' : 'SQLite'}`);

    // Import the database connection
    const { initializeDB, getDB } = require('./db-connection.js');
    
    console.log('🔌 Initializing database connection...');
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    console.log('✅ Database connection established');

    // Check if admin_users table exists
    console.log('🔍 Checking admin_users table...');
    try {
      if (db.isUsingNeon()) {
        await adapter.query("SELECT 1 FROM admin_users LIMIT 1");
      } else {
        await adapter.query("SELECT 1 FROM admin_users LIMIT 1");
      }
      console.log('✅ admin_users table exists');
    } catch (tableError) {
      console.error('❌ admin_users table does not exist or is not accessible');
      console.error('   Make sure the database has been properly initialized');
      throw tableError;
    }

    // Check if admin already exists
    console.log(`🔍 Checking if admin user '${username}' already exists...`);
    let existingAdminQuery, insertQuery, updateQuery;
    
    if (db.isUsingNeon()) {
      existingAdminQuery = 'SELECT * FROM admin_users WHERE username = $1';
      insertQuery = 'INSERT INTO admin_users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)';
      updateQuery = 'UPDATE admin_users SET password_hash = $1, last_login = NULL WHERE username = $2';
    } else {
      existingAdminQuery = 'SELECT * FROM admin_users WHERE username = ?';
      insertQuery = 'INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)';
      updateQuery = 'UPDATE admin_users SET password_hash = ?, last_login = NULL WHERE username = ?';
    }
    
    const existingAdminResult = await adapter.query(existingAdminQuery, [username]);
    const existingAdmin = existingAdminResult[0];
    
    console.log('🔒 Hashing password...');
    const passwordHash = bcrypt.hashSync(password, 12); // Increased salt rounds for better security
    
    if (existingAdmin) {
      console.log(`⚠️  Admin user '${username}' already exists. Updating password...`);
      await adapter.execute(updateQuery, [passwordHash, username]);
      console.log(`✅ Password updated for admin user '${username}'`);
    } else {
      console.log(`➕ Creating new admin user '${username}'...`);
      const adminId = generateId();
      const timestamp = Date.now();
      await adapter.execute(insertQuery, [adminId, username, passwordHash, timestamp]);
      console.log(`✅ Admin user '${username}' created successfully`);
    }

    // Verify the user was created/updated
    console.log('🔍 Verifying admin user...');
    const verifyResult = await adapter.query(existingAdminQuery, [username]);
    if (verifyResult.length > 0) {
      console.log('✅ Admin user verified in database');
    } else {
      throw new Error('Failed to verify admin user creation');
    }

    console.log('\n🎉 Admin user setup completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Admin panel: http://localhost:3000/admin');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('💡 TIP: Keep these credentials secure and don\'t commit them to version control');

  } catch (error) {
    console.error('\n❌ Error creating admin user:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('connect') || error.message.includes('database')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Check your DATABASE_URL in .env.local');
      console.error('   2. Ensure your Neon database is running');
      console.error('   3. Verify network connectivity');
      console.error('   4. Make sure the database tables have been created');
    }
    
    process.exit(1);
  }
}

// Get command line arguments
const [,, username, password] = process.argv;
createAdmin(username, password);