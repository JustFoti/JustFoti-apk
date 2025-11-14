const fs = require('fs');

// Read the encoded data
const encoded = fs.readFileSync('encoded-full.txt', 'utf8').trim();

console.log('Encoded length:', encoded.length);
console.log('First 50 chars:', encoded.substring(0, 50));
console.log('Last 50 chars:', encoded.substring(encoded.length - 50));

// Try hex decode
try {
  const hexDecoded = Buffer.from(encoded, 'hex').toString('utf8');
  console.log('\n=== HEX DECODED ===');
  console.log('Length:', hexDecoded.length);
  console.log('First 200 chars:', hexDecoded.substring(0, 200));
  
  if (hexDecoded.includes('http')) {
    console.log('\n✓ Found HTTP in hex decoded!');
    const m3u8Match = hexDecoded.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
    if (m3u8Match) {
      console.log('M3U8 URL:', m3u8Match[0]);
    }
  } else {
    console.log('\n✗ No HTTP found, trying Caesar shifts...');
    
    // Try Caesar shifts on hex decoded
    for (let shift = -25; shift <= 25; shift++) {
      if (shift === 0) continue;
      
      const caesarResult = hexDecoded.split('').map(c => {
        const code = c.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
        if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
        return c;
      }).join('');
      
      if (caesarResult.includes('http')) {
        console.log(`\n✓ Caesar ${shift} worked!`);
        console.log('First 200 chars:', caesarResult.substring(0, 200));
        
        const m3u8Match = caesarResult.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
        if (m3u8Match) {
          console.log('M3U8 URL:', m3u8Match[0]);
        }
        break;
      }
    }
  }
} catch (err) {
  console.error('Hex decode failed:', err.message);
}
