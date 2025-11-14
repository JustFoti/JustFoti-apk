const fs = require('fs');
const encoded = fs.readFileSync('fresh-encoded.txt', 'utf8');

console.log('Encoded length:', encoded.length);
console.log('First 100:', encoded.substring(0, 100));

// Try direct hex decode
console.log('\n[Test 1] Direct hex decode:');
try {
  const decoded = Buffer.from(encoded, 'hex').toString('utf8');
  console.log('Decoded length:', decoded.length);
  console.log('First 200:', decoded.substring(0, 200));
  console.log('Contains http:', decoded.includes('http'));
  
  if (decoded.includes('http')) {
    console.log('\n*** SUCCESS! ***');
    console.log('Full URL:', decoded);
  }
} catch (err) {
  console.log('Error:', err.message);
}
