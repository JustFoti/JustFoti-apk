/**
 * Database Management CLI
 * Utility script for database operations
 */

import { getDB, getMigrationManager, queries } from '@/lib/db';

const commands = {
  status: 'Show database status and migration info',
  migrate: 'Run pending migrations',
  rollback: 'Rollback last migration',
  'rollback-to': 'Rollback to specific version (usage: rollback-to <version>)',
  optimize: 'Optimize database (vacuum and analyze)',
  stats: 'Show database statistics',
  health: 'Check database health',
  reset: 'Reset database (WARNING: deletes all data)',
  cleanup: 'Clean up old analytics data (90+ days)',
  help: 'Show this help message',
};

async function showStatus() {
  const db = getDB();
  await db.initialize();
  
  const migrationManager = getMigrationManager();
  const status = migrationManager.getStatus();
  
  console.log('\n📊 Database Status\n');
  console.log(`Current Version: ${status.currentVersion}`);
  console.log(`Latest Version: ${status.latestVersion}`);
  console.log(`Pending Migrations: ${status.pendingMigrations}`);
  console.log('');
  
  if (status.appliedMigrations.length > 0) {
    console.log('Applied Migrations:');
    status.appliedMigrations.forEach(m => {
      const date = new Date(m.appliedAt * 1000).toISOString();
      console.log(`  ${m.version}. ${m.name} (${date})`);
    });
  }
  
  db.close();
}

async function runMigrations() {
  const db = getDB();
  await db.initialize();
  
  const migrationManager = getMigrationManager();
  await migrationManager.runMigrations();
  
  db.close();
}

async function rollbackMigration() {
  const db = getDB();
  await db.initialize();
  
  const migrationManager = getMigrationManager();
  await migrationManager.rollbackLastMigration();
  
  db.close();
}

async function rollbackToVersion(version: number) {
  const db = getDB();
  await db.initialize();
  
  const migrationManager = getMigrationManager();
  await migrationManager.rollbackToVersion(version);
  
  db.close();
}

async function optimizeDatabase() {
  const db = getDB();
  await db.initialize();
  
  db.optimize();
  
  db.close();
}

async function showStats() {
  const db = getDB();
  await db.initialize();
  
  const stats = db.getStats();
  
  console.log('\n💾 Database Statistics\n');
  console.log(`Size: ${(stats.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Pages: ${stats.pageCount}`);
  console.log(`Page Size: ${stats.pageSize} bytes`);
  console.log(`Free Pages: ${stats.freePages}`);
  console.log(`Utilization: ${((1 - stats.freePages / stats.pageCount) * 100).toFixed(2)}%`);
  console.log('');
  
  db.close();
}

async function checkHealth() {
  const db = getDB();
  await db.initialize();
  
  const isHealthy = db.healthCheck();
  
  console.log(`\n🏥 Health Check: ${isHealthy ? '✓ Healthy' : '✗ Unhealthy'}\n`);
  
  db.close();
}

async function resetDatabase() {
  console.log('\n⚠️  WARNING: This will delete ALL data in the database!');
  console.log('Type "yes" to confirm: ');
  
  // Simple confirmation (in production, use a proper prompt library)
  const confirmation = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
  
  if (confirmation.toLowerCase() !== 'yes') {
    console.log('Reset cancelled.');
    return;
  }
  
  const db = getDB();
  await db.initialize();
  
  const migrationManager = getMigrationManager();
  await migrationManager.resetDatabase();
  
  db.close();
}

async function cleanupOldData() {
  const db = getDB();
  await db.initialize();
  
  // Delete events older than 90 days
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const deletedCount = queries.analytics.deleteOldEvents(ninetyDaysAgo);
  
  console.log(`\n🧹 Cleanup Complete`);
  console.log(`Deleted ${deletedCount} old event(s)\n`);
  
  // Optimize after cleanup
  db.optimize();
  
  db.close();
}

function showHelp() {
  console.log('\n📚 Database Management CLI\n');
  console.log('Usage: bun run server/db/manage.ts <command> [args]\n');
  console.log('Commands:');
  
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(15)} ${desc}`);
  });
  
  console.log('');
}

async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }
  
  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'migrate':
        await runMigrations();
        break;
      case 'rollback':
        await rollbackMigration();
        break;
      case 'rollback-to':
        const version = parseInt(process.argv[3]);
        if (isNaN(version)) {
          console.error('Error: Please provide a valid version number');
          process.exit(1);
        }
        await rollbackToVersion(version);
        break;
      case 'optimize':
        await optimizeDatabase();
        break;
      case 'stats':
        await showStats();
        break;
      case 'health':
        await checkHealth();
        break;
      case 'reset':
        await resetDatabase();
        break;
      case 'cleanup':
        await cleanupOldData();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
