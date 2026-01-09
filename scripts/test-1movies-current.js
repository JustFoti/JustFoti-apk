// Test current 1movies implementation
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

// Current keys from our implementation
const AES_KEY = new Uint8Array([3,75,207,198,39,85,65,255,64,89,191,251,35,214,209,210,62,164,155,85,247,158,167,48,172,84,13,18,19,166,19,57]);
const AES_IV = new Uint8Array([162,231,173,134,84,100,241,33,5,233,223,132,245,189,171,237]);
const XOR_KEY = new Uint8Array([170,162,126,126,60,255,136,130,133]);

const STANDARD_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const SHUFFLED_ALPHABET = "TuzHOxl7b0RW9o_1FPV3eGfmL4Z5pD8cahBQr2U-6yvEYwngXCdJjANtqKIMiSks";
const API_HASH = 'fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0';

// Build character map
const CHAR_MAP = new Map();
for (let i = 0; i < STANDARD_ALPHABET.length; i++) {
  CHAR_MAP.set(STANDARD_ALPHABET[i], SHUFFLED_ALPHABET[i]);
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function stringToBytes(str) {
  return new TextEncoder().encode(str);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function encodePageData(pageData) {
  // Import the AES key
  const key = await crypto.subtle.importKey(
    'raw',
    AES_KEY.buffer,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
  
  // Encrypt with AES-256-CBC
  const plaintext = stringToBytes(pageData);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: AES_IV.buffer },
    key,
    plaintext.buffer
  );
  
  // Convert to hex string
  const hexString = toHex(new Uint8Array(encrypted));
  
  // XOR each character
  let xored = '';
  for (let i = 0; i < hexString.length; i++) {
    const charCode = hexString.charCodeAt(i);
    const xorByte = XOR_KEY[i % XOR_KEY.length];
    xored += String.fromCharCode(charCode ^ xorByte);
  }
  
  // UTF-8 encode and Base64url
  const utf8Bytes = stringToBytes(xored);
  const base64 = bytesToBase64Url(utf8Bytes);
  
  // Character substitution
  let result = '';
  for (const char of base64) {
    result += CHAR_MAP.get(char) || char;
  }
  
  return result;
}

async function test() {
  console.log('Testing 1movies current implementation...\n');
  
  // Step 1: Fetch page and get pageData
  const pageUrl = `${BASE_URL}/movie/550`;
  console.log('1. Fetching page:', pageUrl);
  
  const pageRes = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await pageRes.text();
  
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('   pageData:', pageData?.substring(0, 50));
  
  // Step 2: Encode the pageData
  console.log('\n2. Encoding pageData...');
  const encoded = await encodePageData(pageData);
  console.log('   Encoded length:', encoded.length);
  console.log('   Encoded preview:', encoded.substring(0, 50));
  
  // Step 3: Try the sources endpoint
  console.log('\n3. Testing sources endpoint...');
  const sourcesUrl = `${BASE_URL}/${API_HASH}/${encoded}/sr`;
  console.log('   URL:', sourcesUrl.substring(0, 80) + '...');
  
  const sourcesRes = await fetch(sourcesUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': BASE_URL,
      'X-Requested-With': 'XMLHttpRequest',
    }
  });
  
  console.log('   Status:', sourcesRes.status);
  
  if (sourcesRes.ok) {
    const sources = await sourcesRes.json();
    console.log('   Sources:', JSON.stringify(sources).substring(0, 200));
    
    if (sources.length > 0) {
      // Step 4: Try to get stream URL
      console.log('\n4. Testing stream endpoint...');
      const streamUrl = `${BASE_URL}/${API_HASH}/${sources[0].data}`;
      console.log('   URL:', streamUrl.substring(0, 80) + '...');
      
      const streamRes = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': BASE_URL,
        }
      });
      
      console.log('   Status:', streamRes.status);
      
      if (streamRes.ok) {
        const streamData = await streamRes.json();
        console.log('   Stream:', JSON.stringify(streamData).substring(0, 200));
      } else {
        const text = await streamRes.text();
        console.log('   Response:', text.substring(0, 200));
      }
    }
  } else {
    const text = await sourcesRes.text();
    console.log('   Response:', text.substring(0, 200));
    
    // Try without the API hash
    console.log('\n   Trying alternative endpoints...');
    
    // Try /api/sources
    const altUrl1 = `${BASE_URL}/api/sources?data=${encodeURIComponent(encoded)}`;
    const altRes1 = await fetch(altUrl1, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log('   /api/sources:', altRes1.status);
    
    // Try direct with pageData
    const altUrl2 = `${BASE_URL}/api/movie/550/sources`;
    const altRes2 = await fetch(altUrl2, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log('   /api/movie/550/sources:', altRes2.status);
  }
}

test().catch(console.error);
