// Decode the r() and t() functions in 1movies
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function decodeFunctions() {
  console.log('Decoding 1movies r() and t() functions...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // Find the string array
  // The array is usually defined at the start of the chunk
  // Pattern: function e(){return e=function(){return n},n} where n is the array
  
  // Look for the array definition
  const arrayMatch = js.match(/\[("[^"]+",?\s*){50,}\]/);
  if (!arrayMatch) {
    console.log('Could not find string array');
    return;
  }
  
  // Parse the array
  const arrayStr = arrayMatch[0];
  const strings = [];
  const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
  let match;
  while ((match = regex.exec(arrayStr)) !== null) {
    strings.push(match[1]);
  }
  
  console.log('Found string array with', strings.length, 'strings');
  console.log('First 50 strings:', strings.slice(0, 50));
  
  // Find the decoder function
  // The r function typically looks like: function r(e, t) { return a()[e - offset] }
  // Or: function r(t, n) { let a = e(); return r = function(e, n) { return a[e - offset] }, r(t, n) }
  
  // Look for the offset
  const offsetMatch = js.match(/return\s+\w+\s*\[\s*\w+\s*-\s*(\d+)\s*\]/);
  let offset = 0;
  if (offsetMatch) {
    offset = parseInt(offsetMatch[1]);
    console.log('\nOffset:', offset);
  } else {
    // Try alternative pattern
    const altOffsetMatch = js.match(/\w+\s*-\s*(\d+)\s*\]/);
    if (altOffsetMatch) {
      offset = parseInt(altOffsetMatch[1]);
      console.log('\nOffset (alt):', offset);
    }
  }
  
  // Define the decoder functions
  // r(e, t) => strings[e - offset]
  // t(e, t, n, a) => r(n - 770, e) => strings[n - 770 - offset]
  
  function r(e, t) {
    const idx = e - offset;
    if (idx >= 0 && idx < strings.length) {
      return strings[idx];
    }
    return `[r(${e},${t}): OUT OF BOUNDS idx=${idx}]`;
  }
  
  function t(e, tt, n, a) {
    // t calls r with (n - 770, e)
    return r(n - 770, e);
  }
  
  // Now decode the hash parts
  console.log('\n=== Decoding hash parts ===');
  
  // From the context:
  // m=r(392,-33)+r(409,-34)+t(1184,1222,1178,1176)+r(381,-150)+r(344,-129)+r(364,-148)+r(413,-112)+r(362,-121)
  // +"pTGy82DLIz"+t(1188,1196,1204,1193)+t(1138,1140,1194,1196)+t(1157,1208,1193,1167)+t(1201,1201,1180,1149)
  // +"pliKjWPhvP"+t(1138,1161,1118,1127)+t(1219,1223,1208,1156)+t(1175,1146,1167,1151)+t(1113,1090,1111,1071)
  // +r(360,-94)+"0363-4e1b-5482-8d76-"+t(1136,1178,1186,1229)+"4b/e993fc0bc499fdfb502f96b8596"
  // +r(377,-72)+t(1092,1125,1113,1150)+t(1233,1152,1196,1215)+r(433,-37)+r(389,-82)+r(386,-58)
  // +"88bf9898b9"+t(1247,1238,1191,1160)+r(399,-90)+"913b00773/ar"
  
  const parts = [
    r(392,-33),
    r(409,-34),
    t(1184,1222,1178,1176),
    r(381,-150),
    r(344,-129),
    r(364,-148),
    r(413,-112),
    r(362,-121),
    "pTGy82DLIz",
    t(1188,1196,1204,1193),
    t(1138,1140,1194,1196),
    t(1157,1208,1193,1167),
    t(1201,1201,1180,1149),
    "pliKjWPhvP",
    t(1138,1161,1118,1127),
    t(1219,1223,1208,1156),
    t(1175,1146,1167,1151),
    t(1113,1090,1111,1071),
    r(360,-94),
    "0363-4e1b-5482-8d76-",
    t(1136,1178,1186,1229),
    "4b/e993fc0bc499fdfb502f96b8596",
    r(377,-72),
    t(1092,1125,1113,1150),
    t(1233,1152,1196,1215),
    r(433,-37),
    r(389,-82),
    r(386,-58),
    "88bf9898b9",
    t(1247,1238,1191,1160),
    r(399,-90),
    "913b00773/ar",
  ];
  
  console.log('Decoded parts:');
  parts.forEach((p, i) => console.log(`  ${i}: "${p}"`));
  
  const fullHash = parts.join('');
  console.log('\nFull hash:', fullHash);
  
  // The hash ends with /ar, so split it
  const hashParts = fullHash.split('/');
  const apiHash = hashParts[0];
  const endpoint = '/' + hashParts.slice(1).join('/');
  
  console.log('\nAPI Hash:', apiHash);
  console.log('Endpoint:', endpoint);
  
  // Now test the API
  console.log('\n=== Testing API ===');
  
  // Get pageData
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('pageData:', pageData);
  
  // Test the API
  const url = `${BASE_URL}/${apiHash}/${pageData}${endpoint}`;
  console.log('\nTesting URL:', url.substring(0, 100) + '...');
  
  const testRes = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': `${BASE_URL}/movie/550`,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/octet-stream',
      'X-Token': 'IWllVsuBx0Iy',
    }
  });
  
  console.log('Status:', testRes.status);
  if (testRes.ok) {
    const text = await testRes.text();
    console.log('Response:', text.substring(0, 500));
  } else {
    const text = await testRes.text();
    console.log('Error response:', text.substring(0, 200));
  }
}

decodeFunctions().catch(console.error);
