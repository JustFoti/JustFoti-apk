/**
 * Database Initialization Script
 * Run this to set up the database for the first time
 */

import { initializeDatabase, getMigrationManager } from '@/lib/db';
import { queries } from '@/lib/db/queries';

async function main() {
  console.log('🚀 Initializing Flyx database...\n');

  try {
    // Initialize database and run migrations
    const db = await initializeDatabase();
    console.log('');

    // Show migration status
    const migrationManager = getMigrationManager();
    const status = migrationManager.getStatus();
    
    console.log('📊 Database Status:');
    console.log(`   Current Version: ${status.currentVersion}`);
    console.log(`   Latest Version: ${status.latestVersion}`);
    console.log(`   Pending Migrations: ${status.pendingMigrations}`);
    console.log(`   Applied Migrations: ${status.appliedMigrations.length}`);
    console.log('');

    // Show database stats
    const stats = db.getStats();
    console.log('💾 Database Statistics:');
    console.log(`   Size: ${(stats.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Pages: ${stats.pageCount}`);
    console.log(`   Page Size: ${stats.pageSize} bytes`);
    console.log(`   Free Pages: ${stats.freePages}`);
    console.log('');

    // Health check
    const isHealthy = db.healthCheck();
    console.log(`🏥 Health Check: ${isHealthy ? '✓ Healthy' : '✗ Unhealthy'}`);
    console.log('');

    // Optional: Create a default admin user (commented out for security)
    // Uncomment and modify to create your first admin user
    /*
    const adminExists = queries.admin.adminExists('admin');
    if (!adminExists) {
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('changeme', 12);
      queries.admin.createAdmin(
        crypto.randomUUID(),
        'admin',
        passwordHash
      );
      console.log('✓ Default admin user created (username: admin, password: changeme)');
      console.log('⚠️  Please change the password immediately!\n');
    }
    */

    console.log('✅ Database initialization complete!\n');
    
    // Close connection
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { main as initDatabase };
