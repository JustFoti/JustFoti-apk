/**
 * Generate extended tables for animekai-crypto.ts
 * Reads all table files and outputs TypeScript code
 */
const fs = require('fs');

// Read all table files
const files = [
  'tables-20-29.txt',
  'tables-30-49.txt',
  'tables-50-59.txt',
  'tables-60-79.txt',
  'tables-80-89.txt',
  'tables-90-99.txt'
];

let allTables = '';

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    allTables += content;
  } catch (e) {
    console.error(`Could not read ${file}:`, e.message);
  }
}

// Output the combined tables
console.log('// Extended tables for positions 20-99');
console.log('// Add these to ENCRYPT_TABLES in animekai-crypto.ts');
console.log(allTables);
