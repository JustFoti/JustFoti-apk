/**
 * Delete Admin User Script
 * Run with: node scripts/delete-admin.js <username>
 */

require('dotenv').config({ path: '.env.local' });

async function deleteAdmin(username) {
  if (!username) {
    console.error('❌ Usage: node scripts/delete-admin.js <username>');
    console.error('   Example: node scripts/delete-admin.js admin');
    process.exit(1);
  }

  console.log('🗑️  Starting admin user deletion...');
  console.log(`👤 Username: ${username}`);

  try {
    // Check environment
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }

    // Import the database connection
    const { initializeDB, getDB } = require('./db-connection.js');
    
    console.log('🔌 Connecting to database...');
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();

    // Check if admin exists
    let existingAdminQuery, deleteQuery;
    
    if (db.isUsingNeon()) {
      existingAdminQuery = 'SELECT * FROM admin_users WHERE username = $1';
      deleteQuery = 'DELETE FROM admin_users WHERE username = $1';
    } else {
      existingAdminQuery = 'SELECT * FROM admin_users WHERE username = ?';
      deleteQuery = 'DELETE FROM admin_users WHERE username = ?';
    }
    
    const existingAdminResult = await adapter.query(existingAdminQuery, [username]);
    const existingAdmin = existingAdminResult[0];
    
    if (!existingAdmin) {
      console.log(`⚠️  Admin user '${username}' does not exist`);
      process.exit(0);
    }

    // Delete the admin user
    console.log(`🗑️  Deleting admin user '${username}'...`);
    await adapter.execute(deleteQuery, [username]);
    
    // Verify deletion
    const verifyResult = await adapter.query(existingAdminQuery, [username]);
    if (verifyResult.length === 0) {
      console.log(`✅ Admin user '${username}' deleted successfully`);
    } else {
      throw new Error('Failed to delete admin user');
    }

  } catch (error) {
    console.error('\n❌ Error deleting admin user:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Get command line arguments
const [,, username] = process.argv;
deleteAdmin(username);