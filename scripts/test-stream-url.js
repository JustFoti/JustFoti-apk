/**
 * Test the constructed stream URL
 */

const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

// Extract all the parameters
const iPattern = /i=e\(\[([0-9,]+)\]\)/;
const iMatch = html.match(iPattern);
const scode = iMatch ? String.fromCharCode(...JSON.parse('[' + iMatch[1] + ']')) : null;

const timestamp = html.match(/a=parseInt\("(\d+)"/)?.[1];
const deviceId = html.match(/r="([a-z0-9]+)"/)?.[1];
const streamId = html.match(/,s="([a-z0-9]{15,})"/)?.[1];
const cMatch = html.match(/c=t\("([A-Za-z0-9+/=]+)"\)/);
const baseUrl = cMatch ? Buffer.from(cMatch[1], 'base64').toString('utf8') : null;
const hostId = html.match(/m="([a-z0-9-]+)"/)?.[1];

console.log('Extracted parameters:');
console.log('  scode:', scode);
console.log('  timestamp:', timestamp);
console.log('  deviceId:', deviceId);
console.log('  streamId:', streamId);
console.log('  baseUrl:', baseUrl);
console.log('  hostId:', hostId);

// Construct the URL
const params = new URLSearchParams({
  scode: scode,
  stream: streamId,
  expires: timestamp,
  u_id: deviceId,
  host_id: hostId,
});

const streamUrl = `${baseUrl}?${params}`;
console.log('\nStream URL:', streamUrl);

// Test the URL
async function testUrl() {
  console.log('\nTesting URL...');
  
  try {
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
      },
      redirect: 'manual',
    });
    
    console.log('Status:', response.status);
    console.log('Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(' ', key + ':', value);
    }
    
    const text = await response.text();
    console.log('\nResponse body (first 1000 chars):');
    console.log(text.substring(0, 1000));
    
    // Check if it's a redirect
    if (response.headers.get('location')) {
      console.log('\nRedirect to:', response.headers.get('location'));
    }
    
    // Check if it contains m3u8
    if (text.includes('#EXTM3U')) {
      console.log('\n✓ Got M3U8 playlist!');
    }
    
    // Look for m3u8 URLs in response
    const m3u8Match = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
    if (m3u8Match) {
      console.log('\nFound m3u8 URL:', m3u8Match[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUrl();
