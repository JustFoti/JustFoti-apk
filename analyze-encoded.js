const fs = require('fs');
const encoded = fs.readFileSync('encoded-full.txt', 'utf8');

console.log('Encoded length:', encoded.length);
console.log('First 100 chars:', encoded.substring(0, 100));
console.log('Last 100 chars:', encoded.substring(encoded.length - 100));

// Character analysis
const chars = {};
for (const c of encoded) {
  chars[c] = (chars[c] || 0) + 1;
}

console.log('\nCharacter frequency:');
const sorted = Object.entries(chars).sort((a, b) => b[1] - a[1]);
for (const [char, count] of sorted.slice(0, 20)) {
  console.log(`  '${char}': ${count}`);
}

// Check if it looks like Base64
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const nonBase64 = encoded.split('').filter(c => !base64Chars.includes(c));
console.log('\nNon-Base64 characters:', nonBase64.length);
if (nonBase64.length > 0 && nonBase64.length < 50) {
  console.log('Non-Base64 chars:', [...new Set(nonBase64)].join(''));
}

// Try Base64 decode
console.log('\n[Test 1] Direct Base64 decode:');
try {
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  console.log('  Decoded length:', decoded.length);
  console.log('  First 100 chars:', decoded.substring(0, 100));
  console.log('  Contains http:', decoded.includes('http'));
  
  // If decoded is empty, try with padding
  if (decoded.length === 0) {
    console.log('  Empty result, trying with padding...');
    const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
    const decoded2 = Buffer.from(padded, 'base64').toString('utf8');
    console.log('  Padded decoded length:', decoded2.length);
    console.log('  Padded first 100 chars:', decoded2.substring(0, 100));
    console.log('  Padded contains http:', decoded2.includes('http'));
  }
} catch (err) {
  console.log('  Error:', err.message);
}

// Try Caesar +3 then Base64
console.log('\n[Test 2] Caesar +3 then Base64:');
try {
  const caesar3 = encoded.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + 3) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 3) % 26) + 97);
    return c;
  }).join('');
  const decoded = Buffer.from(caesar3, 'base64').toString('utf8');
  console.log('  Decoded length:', decoded.length);
  console.log('  First 100 chars:', decoded.substring(0, 100));
  console.log('  Contains http:', decoded.includes('http'));
} catch (err) {
  console.log('  Error:', err.message);
}

// Try Caesar -3 then Base64
console.log('\n[Test 3] Caesar -3 then Base64:');
try {
  const caesarMinus3 = encoded.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 - 3 + 26) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 - 3 + 26) % 26) + 97);
    return c;
  }).join('');
  const decoded = Buffer.from(caesarMinus3, 'base64').toString('utf8');
  console.log('  Decoded length:', decoded.length);
  console.log('  First 100 chars:', decoded.substring(0, 100));
  console.log('  Contains http:', decoded.includes('http'));
} catch (err) {
  console.log('  Error:', err.message);
}
