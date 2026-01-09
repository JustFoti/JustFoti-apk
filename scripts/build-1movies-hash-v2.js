// Build the 1movies hash by decoding the obfuscated functions
require('dotenv').config({ path: '.env.local' });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function buildHash() {
  console.log('=== Building 1movies Hash ===\n');
  
  const chunkUrl = 'https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js';
  const res = await fetch(chunkUrl, { headers: HEADERS });
  const code = await res.text();
  
  // Extract the string array (t = [...])
  const arrayMatch = code.match(/t\s*=\s*\[((?:"[^"]*",?\s*)+)\]/);
  if (!arrayMatch) {
    console.log('Could not find string array');
    return;
  }
  
  const strings = arrayMatch[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1));
  console.log('String array length:', strings.length);
  console.log('First 5 strings:', strings.slice(0, 5));
  
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
  
  // Decode all strings
  const decoded = strings.map(s => customBase64Decode(s));
  console.log('\nDecoded strings:');
  decoded.forEach((s, i) => console.log(`  [${i}] "${s}"`));
  
  // The r() function: r(n, e) returns decoded[n - offset]
  // From the code: function t(e,t,n,a){return r(n-770,e)}
  // So t() calls r(n-770, e)
  // And r(x, y) returns decoded[x - someOffset]
  
  // Let's find the r() function offset
  // Looking at r(392, -33), r(409, -34), etc.
  // These should return hex-like strings
  
  // Let's try to find the offset by testing
  console.log('\n=== Finding r() offset ===');
  
  // The hash starts with r(392,-33)+r(409,-34)+...
  // These should return hex strings that form the beginning of the hash
  
  // Try different offsets
  for (let offset = 300; offset <= 400; offset += 10) {
    const idx1 = 392 - offset;
    const idx2 = 409 - offset;
    
    if (idx1 >= 0 && idx1 < decoded.length && idx2 >= 0 && idx2 < decoded.length) {
      const val1 = decoded[idx1];
      const val2 = decoded[idx2];
      
      // Check if they look like hex
      if (/^[a-f0-9]+$/.test(val1) && /^[a-f0-9]+$/.test(val2)) {
        console.log(`Offset ${offset}: r(392,-33)="${val1}", r(409,-34)="${val2}"`);
      }
    }
  }
  
  // Based on the function definitions:
  // function t(e,t,n,a){return r(n-770,e)}
  // So t(1184,1222,1178,1176) calls r(1178-770, 1184) = r(408, 1184)
  
  // Let's assume r(x, y) = decoded[x - offset]
  // We need to find offset such that r(392, -33) returns a hex string
  
  // Looking at the decoded strings, let's find hex-like ones
  console.log('\n=== Hex-like decoded strings ===');
  decoded.forEach((s, i) => {
    if (/^[a-f0-9]{2,}$/.test(s)) {
      console.log(`  [${i}] "${s}"`);
    }
  });
  
  // Now let's try to build the hash
  // The offset for r() is likely 338 (from previous analysis)
  const rOffset = 338;
  
  function r(n, e) {
    const idx = n - rOffset;
    if (idx >= 0 && idx < decoded.length) {
      return decoded[idx];
    }
    return `[r(${n},${e})->idx${idx}]`;
  }
  
  function t(e, tt, n, a) {
    return r(n - 770, e);
  }
  
  console.log('\n=== Building hash with offset', rOffset, '===');
  
  // Build the hash
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
  
  console.log('\nHash parts:');
  hashParts.forEach((p, i) => console.log(`  [${i}] "${p}"`));
  
  const fullHash = hashParts.join('');
  console.log('\nFull hash:', fullHash);
  
  // Extract just the hash (without /ar)
  const hashOnly = fullHash.replace('/ar', '');
  console.log('Hash only:', hashOnly);
  
  // Test the API
  console.log('\n=== Testing API ===');
  
  // First get pageData
  const pageRes = await fetch('https://111movies.com/movie/550', { headers: HEADERS });
  const pageHtml = await pageRes.text();
  const nextDataMatch = pageHtml.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('pageData:', pageData?.substring(0, 50) + '...');
  
  // Try the API
  const apiUrl = `https://111movies.com/${hashOnly}/${pageData}/ar`;
  console.log('API URL:', apiUrl.substring(0, 100) + '...');
  
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
  }
}

buildHash().catch(console.error);
