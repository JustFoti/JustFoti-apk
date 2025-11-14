const encoded = '=8Df6QXN7pHczZDNIhESIdDVK9kUJZ2TyZGbwtHQ5EWSoFobaB';

console.log('Testing Base64 decode on current format...\n');
console.log('Encoded:', encoded);

// Try direct Base64
try {
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  console.log('\n[1] Direct Base64:');
  console.log('    Length:', decoded.length);
  console.log('    Result:', decoded.substring(0, 100));
  console.log('    Has http:', decoded.includes('http'));
} catch (err) {
  console.log('\n[1] Direct Base64 failed:', err.message);
}

// Try removing leading =
try {
  const cleaned = encoded.replace(/^=+/, '');
  const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
  console.log('\n[2] Base64 (remove leading =):');
  console.log('    Length:', decoded.length);
  console.log('    Result:', decoded.substring(0, 100));
  console.log('    Has http:', decoded.includes('http'));
} catch (err) {
  console.log('\n[2] Base64 (remove leading =) failed:', err.message);
}

// Try with padding
try {
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  console.log('\n[3] Base64 (with padding):');
  console.log('    Length:', decoded.length);
  console.log('    Result:', decoded.substring(0, 100));
  console.log('    Has http:', decoded.includes('http'));
} catch (err) {
  console.log('\n[3] Base64 (with padding) failed:', err.message);
}
