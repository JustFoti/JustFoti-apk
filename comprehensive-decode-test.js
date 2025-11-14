const fs = require('fs');
const encoded = fs.readFileSync('fresh-encoded.txt', 'utf8');
const divId = 'sXnL9MQIry';

console.log('Testing all decoding methods on fresh data...\n');
console.log('Encoded length:', encoded.length);
console.log('DivID:', divId);
console.log('First 50 chars:', encoded.substring(0, 50));

function caesarShift(text, shift) {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    return c;
  }).join('');
}

const tests = [
  {
    name: 'Hex decode only',
    fn: () => Buffer.from(encoded, 'hex').toString('utf8')
  },
  {
    name: 'Hex + XOR with divId',
    fn: () => {
      const hex = Buffer.from(encoded, 'hex');
      const xored = Buffer.alloc(hex.length);
      for (let i = 0; i < hex.length; i++) {
        xored[i] = hex[i] ^ divId.charCodeAt(i % divId.length);
      }
      return xored.toString('utf8');
    }
  },
  {
    name: 'Hex + Caesar +3',
    fn: () => caesarShift(Buffer.from(encoded, 'hex').toString('utf8'), 3)
  },
  {
    name: 'Hex + Caesar -3',
    fn: () => caesarShift(Buffer.from(encoded, 'hex').toString('utf8'), -3)
  },
  {
    name: 'Caesar +3 then Hex',
    fn: () => Buffer.from(caesarShift(encoded, 3), 'hex').toString('utf8')
  },
  {
    name: 'Caesar -3 then Hex',
    fn: () => Buffer.from(caesarShift(encoded, -3), 'hex').toString('utf8')
  },
  {
    name: 'Base64 decode',
    fn: () => Buffer.from(encoded, 'base64').toString('utf8')
  },
  {
    name: 'Hex with g→8, :→/',
    fn: () => {
      const replaced = encoded.replace(/g/g, '8').replace(/:/g, '/');
      return replaced;
    }
  }
];

for (const test of tests) {
  try {
    const result = test.fn();
    const hasHttp = result && (result.includes('http://') || result.includes('https://'));
    console.log(`[${hasHttp ? '✓' : '✗'}] ${test.name}`);
    if (hasHttp) {
      console.log('    First 100:', result.substring(0, 100));
      const m3u8 = result.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (m3u8) {
        console.log('    M3U8:', m3u8[0]);
      }
    }
  } catch (err) {
    console.log(`[✗] ${test.name} - Error: ${err.message}`);
  }
}
