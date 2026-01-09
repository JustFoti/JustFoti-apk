// Build 1movies hash with rotation 111
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function buildHash() {
  console.log('=== Building 1movies Hash (Rotation 111) ===\n');
  
  // Read the chunk
  let code;
  try {
    code = fs.readFileSync('1movies-860-chunk.js', 'utf8');
  } catch {
    const res = await fetch('https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js');
    code = await res.text();
  }
  
  // Extract the string array
  const arrayMatch = code.match(/t\s*=\s*\[((?:"[^"]*",?\s*)+)\]/);
  const strings = arrayMatch[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1));
  
  // Custom base64 decode
  const customAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
  const standardAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  
  function customBase64Decode(str) {
    let swapped = '';
    for (const c of str) {
      const idx = customAlphabet.indexOf(c);
      if (idx >= 0) {
        swapped += standardAlphabet[idx];
      } else {
        swapped += c;
      }
    }
    try {
      return Buffer.from(swapped, 'base64').toString('utf8');
    } catch {
      return str;
    }
  }
  
  // Apply rotation 111
  let rotatedArray = [...strings];
  for (let i = 0; i < 111; i++) {
    rotatedArray.push(rotatedArray.shift());
  }
  
  // Decode all strings
  const decoded = rotatedArray.map(s => customBase64Decode(s));
  
  console.log('Decoded array (all):');
  decoded.forEach((s, i) => console.log(`  [${i}] "${s}"`));
  
  // Define r() and t() functions
  function r(n, e) {
    const idx = n - 338;
    if (idx >= 0 && idx < decoded.length) {
      return decoded[idx];
    }
    return `[INVALID:r(${n},${e})->idx${idx}]`;
  }
  
  function t(e, tt, n, a) {
    return r(n - 770, e);
  }
  
  console.log('\n=== Testing individual calls ===');
  console.log('r(392, -33) =', r(392, -33), '(idx 54)');
  console.log('r(409, -34) =', r(409, -34), '(idx 71)');
  console.log('t(1184, 1222, 1178, 1176) =', t(1184, 1222, 1178, 1176), '(r(408, 1184) -> idx 70)');
  console.log('r(381, -150) =', r(381, -150), '(idx 43)');
  console.log('r(344, -129) =', r(344, -129), '(idx 6)');
  
  // Build the hash
  console.log('\n=== Building hash ===');
  
  const hashParts = [
    r(392, -33),
    r(409, -34),
    t(1184, 1222, 1178, 1176),
    r(381, -150),
    r(344, -129),
    r(364, -148),
    r(413, -112),
    r(362, -121),
    "pTGy82DLIz",
    t(1188, 1196, 1204, 1193),
    t(1138, 1140, 1194, 1196),
    t(1157, 1208, 1193, 1167),
    t(1201, 1201, 1180, 1149),
    "pliKjWPhvP",
    t(1138, 1161, 1118, 1127),
    t(1219, 1223, 1208, 1156),
    t(1175, 1146, 1167, 1151),
    t(1113, 1090, 1111, 1071),
    r(360, -94),
    "0363-4e1b-5482-8d76-",
    t(1136, 1178, 1186, 1229),
    "4b/e993fc0bc499fdfb502f96b8596",
    r(377, -72),
    t(1092, 1125, 1113, 1150),
    t(1233, 1152, 1196, 1215),
    r(433, -37),
    r(389, -82),
    r(386, -58),
    "88bf9898b9",
    t(1247, 1238, 1191, 1160),
    r(399, -90),
    "913b00773/ar"
  ];
  
  console.log('Hash parts:');
  hashParts.forEach((p, i) => console.log(`  [${i}] "${p}"`));
  
  const fullPath = hashParts.join('');
  console.log('\nFull URL path:', fullPath);
  
  // Extract hash (without /ar)
  const hashOnly = fullPath.replace('/ar', '');
  console.log('Hash only:', hashOnly);
  
  // Test the API
  console.log('\n=== Testing API ===');
  
  // Get pageData
  const pageRes = await fetch('https://111movies.com/movie/550', { headers: HEADERS });
  const pageHtml = await pageRes.text();
  const nextDataMatch = pageHtml.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('pageData:', pageData?.substring(0, 50) + '...');
  
  // Build API URL
  const apiUrl = `https://111movies.com/${hashOnly}/${pageData}/ar`;
  console.log('API URL:', apiUrl.substring(0, 120) + '...');
  
  // Try the API
  const apiRes = await fetch(apiUrl, {
    headers: {
      ...HEADERS,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/octet-stream',
      'x-cache-token': 'IWllVsuBx0Iy',
    }
  });
  
  console.log('API Response:', apiRes.status);
  if (apiRes.ok) {
    const body = await apiRes.text();
    console.log('Body:', body.substring(0, 500));
  } else {
    const body = await apiRes.text();
    console.log('Error body:', body.substring(0, 200));
  }
}

buildHash().catch(console.error);
