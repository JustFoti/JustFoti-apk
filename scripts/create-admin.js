/**
 * Create Admin User Script
 * Run with: bun scripts/create-admin.js <username> <password>
 */

const bcrypt = require('bcryptjs');

// Generate a simple ID function
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function createAdmin(username, password) {
  if (!username || !password) {
    console.error('Usage: bun scripts/create-admin.js <username> <password>');
    process.exit(1);
  }

  try {
    // Import the database connection
    const { initializeDB, getDB } = await import('../app/lib/db/neon-connection.ts');
    
    // Initialize database
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();

    // Check if admin already exists
    let existingAdminQuery, insertQuery, updateQuery;
    
    if (db.isUsingNeon()) {
      existingAdminQuery = 'SELECT * FROM admin_users WHERE username = $1';
      insertQuery = 'INSERT INTO admin_users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)';
      updateQuery = 'UPDATE admin_users SET password_hash = $1 WHERE username = $2';
    } else {
      existingAdminQuery = 'SELECT * FROM admin_users WHERE username = ?';
      insertQuery = 'INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)';
      updateQuery = 'UPDATE admin_users SET password_hash = ? WHERE username = ?';
    }
    
    const existingAdminResult = await adapter.query(existingAdminQuery, [username]);
    const existingAdmin = existingAdminResult[0];
    
    const passwordHash = bcrypt.hashSync(password, 10);
    
    if (existingAdmin) {
      console.log(`Admin user '${username}' already exists. Updating password...`);
      await adapter.execute(updateQuery, [passwordHash, username]);
      console.log(`✅ Password updated for admin user '${username}'`);
    } else {
      // Create new admin user
      await adapter.execute(insertQuery, [generateId(), username, passwordHash, Date.now()]);
      console.log(`✅ Admin user '${username}' created successfully`);
    }

    console.log('\n📊 Admin panel will be available at: /admin');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log('\n⚠️  Make sure to change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const [,, username, password] = process.argv;
createAdmin(username, password);