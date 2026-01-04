/**
 * Create Feedback Table Script
 * 
 * This script is deprecated after the Cloudflare migration.
 * The feedback table is now created via D1 schema initialization.
 * 
 * To create the feedback table in D1, run:
 *   npm run d1:init
 * 
 * Or manually:
 *   npx wrangler d1 execute flyx-admin-db --file=scripts/init-d1-admin.sql
 */

console.log('⚠️  This script is deprecated after the Cloudflare migration.');
console.log('');
console.log('The feedback table is now managed via D1 schema initialization.');
console.log('');
console.log('To initialize the D1 database schema, run:');
console.log('  npm run d1:init');
console.log('');
console.log('Or for local development:');
console.log('  npm run d1:init:local');
console.log('');
console.log('The schema is defined in: scripts/init-d1-admin.sql');
