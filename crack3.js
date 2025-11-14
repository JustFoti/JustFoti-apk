const encoded = "Dqw6nfuzf7Wyc1KQ0ZCnZcO1ZKR1YBIhETWWgrIEd5Rjh9IHp2LipyEgAYCXtnaxpgYXd0JW5pIRtnMRg2DGZKeUUpbUIXEnYLKQ0tF2kYfyRoZFkSXWhJDEc";

// Analyze character frequency
const chars = {};
for (const c of encoded) {
  chars[c] = (chars[c] || 0) + 1;
}

console.log('Character frequency:');
console.log(chars);

// Check if it looks like Base64
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const hasOnlyBase64 = encoded.split('').every(c => base64Chars.includes(c));
console.log('\nContains only Base64 chars:', hasOnlyBase64);

// Try URL-safe Base64 (replace - with + and _ with /)
const urlSafe = encoded.replace(/-/g, '+').replace(/_/g, '/');
console.log('\nTrying URL-safe Base64 decode...');
try {
  const decoded = Buffer.from(urlSafe, 'base64').toString('utf8');
  console.log('Decoded:', decoded.substring(0, 100));
} catch (err) {
  console.log('Failed:', err.message);
}
