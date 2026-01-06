/**
 * Test fetching the manifest URL directly
 */

const fs = require('fs');
const script = fs.readFileSync('scripts/casthill-script-2.js', 'utf8');

// Decode the manifest URL
const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
const charCodes = JSON.parse('[' + dMatch[1] + ']');
const dString = String.fromCharCode(...charCodes);
const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');

// Get device_id
const rMatch = script.match(/r="([a-z0-9]+)"/);
const deviceId = rMatch[1];

console.log('Manifest URL:', manifestUrl);
console.log('Device ID:', deviceId);

// The code adds u_id to the URL
const url = new URL(manifestUrl);
url.searchParams.set('u_id', deviceId);

console.log('\nFull URL:', url.toString());

async function testManifest() {
  console.log('\nFetching manifest...');
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
      },
      redirect: 'follow',
    });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Final URL:', response.url);
    
    const text = await response.text();
    console.log('\nResponse (first 2000 chars):');
    console.log(text.substring(0, 2000));
    
    if (text.includes('#EXTM3U')) {
      console.log('\n✓ Got M3U8 playlist!');
      
      // Extract the actual stream URLs from the playlist
      const lines = text.split('\n');
      console.log('\nPlaylist entries:');
      lines.forEach(line => {
        if (line.startsWith('http') || line.endsWith('.ts') || line.endsWith('.m3u8')) {
          console.log(' ', line);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testManifest();
