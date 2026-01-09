// Test the 1movies extractor
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

// API hash from the chunk
const API_HASH = 'h/APA91Pu8JKhvEMftnB2QqFE9aSTlLqQF4iF0DRuk7YXkLqvJaUmlRlblS_1ZK6t2VIbx68GVQ5AVkepTGy82DLIz_uAyGx3Z421GLf2TIhbySFvE1bOInrzHRKLtjkPTpliKjWPhvPIzDjFmHp4zwMvRvqLhstjw4CVCy8jn-BuTxk1SRkl8s1r/ef860363-4e1b-5482-8d76-ec6fdebe974b/e993fc0bc499fdfb502f96b85963f9f0bbc698dd/wiv/1000044292358307/1bda1d30afdf5f775dcddb0a888bf9898b90ad4d3e1089396585236913b00773/ar';

const CSRF_TOKEN = 'WP6BXZEsOAvSP0tk4AhxIWllVsuBx0Iy';

// Encryption keys from the chunk (correct values)
const AES_KEY = Buffer.from([138,238,17,197,68,75,124,44,53,79,11,131,216,176,124,80,161,126,163,21,238,68,192,209,135,253,84,163,18,158,148,102]);
const AES_IV = Buffer.from([181,63,33,220,121,92,190,223,94,49,56,160,53,233,201,230]);
const XOR_KEY = Buffer.from([215,136,144,55,198]);

// Character substitution (u -> d mapping)
const U_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const D_CHARS = "c86mtuVv2EUlDgX-1YSpoiTq9WJadfzNe_Rs53kMrKHQZnxL0wGCFBhb7AP4yIOj";

const ENCODE_MAP = new Map();
for (let i = 0; i < U_CHARS.length; i++) {
  ENCODE_MAP.set(U_CHARS[i], D_CHARS[i]);
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://111movies.com/',
  'Content-Type': 'text/javascript',
  'x-csrf-token': CSRF_TOKEN,
};

async function encodePageData(pageData) {
  const crypto = require('crypto');
  
  console.log('   Input pageData length:', pageData.length);
  
  // AES-256-CBC encrypt
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(pageData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  console.log('   AES encrypted (hex) length:', encrypted.length);
  console.log('   AES encrypted (hex) first 50:', encrypted.substring(0, 50));
  
  // XOR each character of the hex string with the key
  let xored = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i);
    const xorByte = XOR_KEY[i % XOR_KEY.length];
    xored += String.fromCharCode(charCode ^ xorByte);
  }
  
  console.log('   XOR\'d length:', xored.length);
  
  // Base64url encode
  const base64 = Buffer.from(xored, 'binary').toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  console.log('   Base64url length:', base64.length);
  console.log('   Base64url first 50:', base64.substring(0, 50));
  
  // Character substitution
  let result = '';
  for (const char of base64) {
    result += ENCODE_MAP.get(char) || char;
  }
  
  console.log('   Final encoded first 50:', result.substring(0, 50));
  
  return result;
}

async function test1movies() {
  console.log('=== Testing 1movies Extractor ===\n');
  
  // Step 1: Fetch page data
  console.log('1. Fetching page data...');
  const pageRes = await fetch(`${BASE_URL}/movie/550`, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
  const pageHtml = await pageRes.text();
  
  const nextDataMatch = pageHtml.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!nextDataMatch) {
    console.log('ERROR: Could not find __NEXT_DATA__');
    return;
  }
  
  const nextData = JSON.parse(nextDataMatch[1]);
  console.log('   nextData.props.pageProps keys:', Object.keys(nextData.props?.pageProps || {}));
  
  const pageData = nextData.props?.pageProps?.data;
  const pageData2 = nextData.props?.pageProps?._data;
  console.log('   pageProps.data:', pageData?.substring(0, 50) + '...');
  console.log('   pageProps._data:', pageData2?.substring(0, 50) + '...');
  
  // Use the correct property
  const dataToEncode = pageData2 || pageData;
  if (!dataToEncode) {
    console.log('ERROR: No data found');
    return;
  }
  console.log('   pageData:', pageData?.substring(0, 50) + '...');
  
  // Step 2: Encode page data
  console.log('\n2. Encoding page data...');
  const encoded = await encodePageData(dataToEncode);
  console.log('   encoded:', encoded.substring(0, 50) + '...');
  console.log('   length:', encoded.length);
  
  // Step 3: Fetch sources
  console.log('\n3. Fetching sources...');
  const sourcesUrl = `${BASE_URL}/${API_HASH}/${encoded}/sr`;
  console.log('   URL:', sourcesUrl.substring(0, 100) + '...');
  
  const sourcesRes = await fetch(sourcesUrl, { headers: HEADERS });
  console.log('   Status:', sourcesRes.status);
  
  if (!sourcesRes.ok) {
    const text = await sourcesRes.text();
    console.log('   Error:', text.substring(0, 200));
    return;
  }
  
  const sources = await sourcesRes.json();
  console.log('   Sources:', sources.length);
  sources.forEach(s => console.log('     -', s.name, ':', s.data?.substring(0, 50) + '...'));
  
  // Step 4: Fetch stream URL for first source
  if (sources.length > 0) {
    console.log('\n4. Fetching stream URL for', sources[0].name + '...');
    const streamUrl = `${BASE_URL}/${API_HASH}/${sources[0].data}`;
    console.log('   URL:', streamUrl.substring(0, 100) + '...');
    
    const streamRes = await fetch(streamUrl, { headers: HEADERS });
    console.log('   Status:', streamRes.status);
    
    if (streamRes.ok) {
      const streamData = await streamRes.json();
      console.log('   Stream URL:', streamData.url?.substring(0, 80) + '...');
      console.log('   noReferrer:', streamData.noReferrer);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

test1movies().catch(console.error);
