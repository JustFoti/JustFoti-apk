/**
 * Run Behavioral Migration Script
 * 
 * This script is deprecated after the Cloudflare migration.
 * Database schema changes are now managed via D1 initialization.
 * 
 * To update the D1 schema, modify scripts/init-d1-admin.sql and run:
 *   npm run d1:init
 */

console.log('⚠️  This script is deprecated after the Cloudflare migration.');
console.log('');
console.log('Database schema changes are now managed via D1 initialization.');
console.log('');
console.log('To update the D1 database schema, run:');
console.log('  npm run d1:init');
console.log('');
console.log('Or for local development:');
console.log('  npm run d1:init:local');
console.log('');
console.log('The schema is defined in: scripts/init-d1-admin.sql');
