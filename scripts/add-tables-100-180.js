/**
 * Add tables 100-180 to animekai-crypto.ts
 */
const fs = require('fs');

const cryptoFile = 'app/lib/animekai-crypto.ts';
const tablesFile = 'tables-100-180.txt';

// Read the new tables
const newTables = fs.readFileSync(tablesFile, 'utf8');

// Read the crypto file
let crypto = fs.readFileSync(cryptoFile, 'utf8');

// Find "// Extended tables for positions 20-99" comment followed by };
const marker = '// Extended tables for positions 20-99 (generated)\n};';
const insertPoint = crypto.indexOf(marker);

if (insertPoint === -1) {
  console.error('Could not find insertion marker');
  console.log('Looking for alternative...');
  
  // Try finding just the }; before "// Build reverse tables"
  const altMarker = '};\n\n// Build reverse tables';
  const altPoint = crypto.indexOf(altMarker);
  
  if (altPoint === -1) {
    console.error('Could not find any insertion point');
    process.exit(1);
  }
  
  const newContent = crypto.slice(0, altPoint) + 
    '\n\n  // Extended tables for positions 100-180 (generated)\n' + 
    newTables +
    crypto.slice(altPoint);
  
  fs.writeFileSync(cryptoFile, newContent);
} else {
  // Replace the marker with marker + new tables
  const newContent = crypto.replace(
    marker,
    '// Extended tables for positions 20-99 (generated)\n\n  // Extended tables for positions 100-180 (generated)\n' + newTables + '};'
  );
  
  fs.writeFileSync(cryptoFile, newContent);
}

console.log('✓ Added tables 100-180 to animekai-crypto.ts');
console.log('Now run: node scripts/test-decrypt-native.js');
