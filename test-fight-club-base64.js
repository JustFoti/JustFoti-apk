// Test Base64 decode on Fight Club
const encoded = '=sDe2AXM3ZHbvJDRERERRJWUnRHe9NVdHZWTvRUe3gVXW1kVSR';

console.log('Testing Base64 decode...\n');
console.log('Encoded:', encoded);

// Try removing leading =
const cleaned = encoded.replace(/^=+/, '');
console.log('\n[1] Cleaned (remove =):', cleaned);

try {
  const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
  console.log('    Decoded length:', decoded.length);
  console.log('    Decoded:', decoded);
  console.log('    Has http:', decoded.includes('http'));
} catch (err) {
  console.log('    Error:', err.message);
}

// Try with padding
const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);
console.log('\n[2] With padding:', padded);

try {
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  console.log('    Decoded length:', decoded.length);
  console.log('    Decoded:', decoded);
  console.log('    Has http:', decoded.includes('http'));
} catch (err) {
  console.log('    Error:', err.message);
}
