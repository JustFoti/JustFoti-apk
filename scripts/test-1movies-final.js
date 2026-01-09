// Test the 1movies encoding algorithm matches the browser
const crypto = require('crypto');

const BASE_URL = 'https://111movies.com';
const API_HASH = 'h/APA91Pu8JKhvEMftnB2QqFE9aSTlLqQF4iF0DRuk7YXkLqvJaUmlRlblS_1ZK6t2VIbx68GVQ5AVkepTGy82DLIz_uAyGx3Z421GLf2TIhbySFvE1bOInrzHRKLtjkPTpliKjWPhvPIzDjFmHp4zwMvRvqLhstjw4CVCy8jn-BuTxk1SRkl8s1r/ef860363-4e1b-5482-8d76-ec6fdebe974b/e993fc0bc499fdfb502f96b85963f9f0bbc698dd/wiv/1000044292358307/1bda1d30afdf5f775dcddb0a888bf9898b90ad4d3e1089396585236913b00773/ar';
const CSRF_TOKEN = 'WP6BXZEsOAvSP0tk4AhxIWllVsuBx0Iy';

// Keys from the chunk
const AES_KEY = Buffer.from([138,238,17,197,68,75,124,44,53,79,11,131,216,176,124,80,161,126,163,21,238,68,192,209,135,253,84,163,18,158,148,102]);
const AES_IV = Buffer.from([181,63,33,220,121,92,190,223,94,49,56,160,53,233,201,230]);
const XOR_KEY = Buffer.from([215,136,144,55,198]);

// Character substitution
const U_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
const D_CHARS = 'c86mtuVv2EUlDgX-1YSpoiTq9WJadfzNe_Rs53kMrKHQZnxL0wGCFBhb7AP4yIOj';

const ENCODE_MAP = new Map();
for (let i = 0; i < U_CHARS.length; i++) {
  ENCODE_MAP.set(U_CHARS[i], D_CHARS[i]);
}

function encodePageData(pageData) {
  // AES-256-CBC encrypt
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(pageData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // XOR each character code
  let xored = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i);
    const xorByte = XOR_KEY[i % XOR_KEY.length];
    xored += String.fromCharCode(charCode ^ xorByte);
  }
  
  // UTF-8 encode then base64url
  const base64 = Buffer.from(xored, 'utf8').toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Character substitution
  let result = '';
  for (const char of base64) {
    result += ENCODE_MAP.get(char) || char;
  }
  
  return result;
}

async function test() {
  console.log('=== Testing 1movies Extractor ===\n');
  
  // Fetch the page to get pageData
  const response = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  
  if (!match) {
    console.log('Could not find __NEXT_DATA__');
    return;
  }
  
  const nextData = JSON.parse(match[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  if (!pageData) {
    console.log('No pageData found');
    return;
  }
  
  console.log('PageData:', pageData.substring(0, 50) + '...');
  console.log('PageData length:', pageData.length);
  
  // Encode
  const encoded = encodePageData(pageData);
  console.log('\nEncoded:', encoded.substring(0, 50) + '...');
  console.log('Encoded length:', encoded.length);
  
  // Try to fetch sources
  const sourcesUrl = `${BASE_URL}/${API_HASH}/${encoded}/sr`;
  console.log('\nFetching sources...');
  
  const sourcesResponse = await fetch(sourcesUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'text/javascript',
      'x-csrf-token': CSRF_TOKEN,
      'Referer': 'https://111movies.com/',
    }
  });
  
  console.log('Sources response status:', sourcesResponse.status);
  
  if (sourcesResponse.ok) {
    const sources = await sourcesResponse.json();
    console.log('\n*** SUCCESS! ***');
    console.log('Sources:', JSON.stringify(sources, null, 2));
    
    // Try to get stream URL for first source
    if (sources.length > 0) {
      const firstSource = sources[0];
      console.log('\nFetching stream for:', firstSource.name);
      
      const streamUrl = `${BASE_URL}/${API_HASH}/${firstSource.data}`;
      const streamResponse = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'text/javascript',
          'x-csrf-token': CSRF_TOKEN,
          'Referer': 'https://111movies.com/',
        }
      });
      
      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        console.log('Stream URL:', streamData.url?.substring(0, 80) + '...');
      } else {
        console.log('Stream fetch failed:', streamResponse.status);
      }
    }
  } else {
    const text = await sourcesResponse.text();
    console.log('Failed! Response:', text.substring(0, 200));
  }
}

test().catch(console.error);
