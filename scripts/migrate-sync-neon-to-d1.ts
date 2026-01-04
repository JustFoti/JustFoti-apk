/**
 * Migration Script: Neon → D1 Sync Data
 * 
 * ⚠️ DEPRECATED: This script was used for the one-time migration from Neon to D1.
 * The migration is now complete and D1 is the primary database.
 * 
 * This script is kept for reference only.
 */

console.log('⚠️  This migration script is deprecated.');
console.log('');
console.log('The migration from Neon to D1 has been completed.');
console.log('D1 is now the primary database for all operations.');
console.log('');
console.log('For D1 database management, use:');
console.log('  npm run d1:init        - Initialize D1 schema');
console.log('  npm run d1:init:local  - Initialize local D1 schema');
console.log('');
console.log('Or use wrangler d1 commands directly:');
console.log('  npx wrangler d1 execute flyx-sync-db --command="SELECT * FROM sync_accounts LIMIT 10"');
