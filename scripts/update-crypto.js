/**
 * Update animekai-crypto.ts to use position-specific tables (not modulo)
 * This script reads the table files and updates the crypto implementation
 */
const fs = require('fs');

// Read all extended tables
const tableFiles = [
  'tables-20-29.txt',
  'tables-30-49.txt',
  'tables-50-59.txt',
  'tables-60-79.txt',
  'tables-80-89.txt',
  'tables-90-99.txt'
];

let extendedTables = '';
for (const file of tableFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    extendedTables += content;
  } catch (e) {
    console.error(`Could not read ${file}:`, e.message);
  }
}

// Read current crypto file
const cryptoFile = fs.readFileSync('app/lib/animekai-crypto.ts', 'utf8');

// Find where ENCRYPT_TABLES ends (after position 19)
const insertPoint = cryptoFile.indexOf('};', cryptoFile.indexOf('19: {'));
if (insertPoint === -1) {
  console.error('Could not find insertion point');
  process.exit(1);
}

// Insert extended tables before the closing };
const newCryptoFile = cryptoFile.slice(0, insertPoint) + 
  '\n  // Extended tables for positions 20-99 (generated)\n' +
  extendedTables +
  cryptoFile.slice(insertPoint);

// Also update the encryption/decryption logic to use actual position, not modulo
// For encryption: positions 0-6 use tables 0-6, position 7+ uses table at getCipherPosition(i)
// For decryption: use the actual table position, not modulo

const updatedFile = newCryptoFile
  // Update encryption to use actual table position for positions 20+
  .replace(
    /\/\/ Use modulo for positions >= 20\s*\n\s*const tablePos = i % 20;/,
    '// Use actual table position (we have tables 0-99)\n    const tablePos = i;'
  )
  // Update decryption similarly
  .replace(
    /const tablePos = plainPos % 20;/g,
    'const tablePos = plainPos;'
  );

fs.writeFileSync('app/lib/animekai-crypto.ts', updatedFile);
console.log('Updated app/lib/animekai-crypto.ts with extended tables');
console.log('Tables added for positions 20-99');
