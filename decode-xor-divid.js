const fs = require('fs');
const encoded = fs.readFileSync('fresh-encoded.txt', 'utf8');
const divId = 'sXnL9MQIry'; // From the extraction

console.log('DivID:', divId);
console.log('Encoded length:', encoded.length);

// Hex decode first
const hexDecoded = Buffer.from(encoded, 'hex');
console.log('Hex decoded length:', hexDecoded.length);

// XOR with divId
const xored = Buffer.alloc(hexDecoded.length);
for (let i = 0; i < hexDecoded.length; i++) {
  xored[i] = hexDecoded[i] ^ divId.charCodeAt(i % divId.length);
}

const result = xored.toString('utf8');
console.log('\nXOR result length:', result.length);
console.log('First 200 chars:', result.substring(0, 200));
console.log('Contains http:', result.includes('http'));

if (result.includes('http')) {
  console.log('\n*** SUCCESS! ***');
  const m3u8Match = result.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  if (m3u8Match) {
    console.log('M3U8 URL:', m3u8Match[0]);
  }
}
