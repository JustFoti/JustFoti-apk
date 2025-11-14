const fs = require('fs');
const encoded = fs.readFileSync('fight-club-encoded.txt', 'utf8');
const divId = fs.readFileSync('fight-club-divid.txt', 'utf8');

console.log('Testing ALL methods from documentation...\n');
console.log('Encoded length:', encoded.length);
console.log('DivID:', divId);
console.log('First 50:', encoded.substring(0, 50));

function caesarShift(text, shift) {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    return c;
  }).join('');
}

function testMethod(name, fn) {
  try {
    const result = fn();
    const hasHttp = result && (result.includes('http://') || result.includes('https://'));
    console.log(`[${hasHttp ? '✓' : '✗'}] ${name}`);
    if (hasHttp) {
      console.log('    Result:', result.substring(0, 150));
      const m3u8 = result.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (m3u8) console.log('    M3U8:', m3u8[0]);
      return true;
    }
  } catch (err) {
    console.log(`[✗] ${name} - Error: ${err.message}`);
  }
  return false;
}

// Test all methods
if (testMethod('Caesar +3', () => caesarShift(encoded, 3))) process.exit(0);
if (testMethod('Caesar -3', () => caesarShift(encoded, -3))) process.exit(0);

// Base64
if (testMethod('Base64', () => Buffer.from(encoded, 'base64').toString('utf8'))) process.exit(0);
if (testMethod('Base64 (remove =)', () => Buffer.from(encoded.replace(/^=+/, ''), 'base64').toString('utf8'))) process.exit(0);

// Reversed Base64
if (testMethod('Reverse Base64', () => Buffer.from(encoded.split('').reverse().join(''), 'base64').toString('utf8'))) process.exit(0);

// Hex
if (testMethod('Hex', () => Buffer.from(encoded, 'hex').toString('utf8'))) process.exit(0);
if (testMethod('Hex (remove non-hex)', () => Buffer.from(encoded.replace(/[^0-9a-fA-F]/g, ''), 'hex').toString('utf8'))) process.exit(0);

// XOR with divId
if (testMethod('XOR with divId', () => {
  const buf = Buffer.from(encoded);
  const xored = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    xored[i] = buf[i] ^ divId.charCodeAt(i % divId.length);
  }
  return xored.toString('utf8');
})) process.exit(0);

// Base64 + XOR
if (testMethod('Base64 + XOR', () => {
  const b64 = Buffer.from(encoded.replace(/^=+/, ''), 'base64');
  const xored = Buffer.alloc(b64.length);
  for (let i = 0; i < b64.length; i++) {
    xored[i] = b64[i] ^ divId.charCodeAt(i % divId.length);
  }
  return xored.toString('utf8');
})) process.exit(0);

console.log('\nAll methods failed!');
