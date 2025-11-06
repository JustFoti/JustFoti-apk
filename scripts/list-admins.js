/**
 * List Admin Users Script
 * Run with: node scripts/list-admins.js
 */

require('dotenv').config({ path: '.env.local' });

async function listAdmins() {
  console.log('🔍 Listing admin users...');

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
    
    console.log('🔌 Connecting to database...');
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    console.log('✅ Database connection established');

    // Get all admin users
    const admins = await adapter.query('SELECT id, username, created_at, last_login FROM admin_users ORDER BY created_at DESC');
    
    if (admins.length === 0) {
      console.log('📭 No admin users found');
      console.log('💡 Create one with: node scripts/create-admin.js <username> <password>');
    } else {
      console.log(`\n👥 Found ${admins.length} admin user(s):`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      admins.forEach((admin, index) => {
        const createdDate = new Date(admin.created_at).toLocaleString();
        const lastLogin = admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never';
        
        console.log(`${index + 1}. Username: ${admin.username}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Created: ${createdDate}`);
        console.log(`   Last Login: ${lastLogin}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('\n❌ Error listing admin users:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

listAdmins();