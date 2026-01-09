// Build 1movies hash - the array is NOT shuffled
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

async function buildHash() {
  console.log('=== Building 1movies Hash ===\n');
  
  let code;
  try {
    code = fs.readFileSync('1movies-860-chunk.js', 'utf8');
  } catch {
    const res = await fetch('https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js');
    code = await res.text();
  }
  
  // Extract the array from e() function - it's NOT shuffled
  const arrayMatch = code.match(/function e\(\)\{let t=\[((?:"[^"]*",?)+)\]/);
  const strings = arrayMatch[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1));
  
  console.log('Array length:', strings.length);
  
  // Custom base64 decode (from the r() function)
  function customBase64Decode(str) {
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
    let t = "", n = "";
    for (let i = 0, r, a, idx = 0; a = str.charAt(idx++); ~a && (r = i % 4 ? 64 * r + a : a, i++ % 4) && (t += String.fromCharCode(255 & r >> (-2 * i & 6))))
      a = alphabet.indexOf(a);
    for (let e = 0, r = t.length; e < r; e++)
      n += "%" + ("00" + t.charCodeAt(e).toString(16)).slice(-2);
    return decodeURIComponent(n);
  }
  
  // Decode all strings
  const decoded = strings.map(s => customBase64Decode(s));
  console.log('Decoded (first 20):');
  decoded.slice(0, 20).forEach((s, i) => console.log('  [' + i + '] "' + s + '"'));
  
  // r(n, e) returns decoded[n - 338]
  function r(n, e) {
    const idx = n - 338;
    return decoded[idx] || '[INVALID]';
  }
  
  // t(e, tt, n, a) returns r(n - 770, e)
  function t(e, tt, n, a) {
    return r(n - 770, e);
  }
  
  // Build the hash
  const hashParts = [
    r(392, -33), r(409, -34), t(1184, 1222, 1178, 1176),
    r(381, -150), r(344, -129), r(364, -148), r(413, -112), r(362, -121),
    "pTGy82DLIz",
    t(1188, 1196, 1204, 1193), t(1138, 1140, 1194, 1196),
    t(1157, 1208, 1193, 1167), t(1201, 1201, 1180, 1149),
    "pliKjWPhvP",
    t(1138, 1161, 1118, 1127), t(1219, 1223, 1208, 1156),
    t(1175, 1146, 1167, 1151), t(1113, 1090, 1111, 1071),
    r(360, -94),
    "0363-4e1b-5482-8d76-",
    t(1136, 1178, 1186, 1229),
    "4b/e993fc0bc499fdfb502f96b8596",
    r(377, -72),
    t(1092, 1125, 1113, 1150), t(1233, 1152, 1196, 1215),
    r(433, -37), r(389, -82), r(386, -58),
    "88bf9898b9",
    t(1247, 1238, 1191, 1160), r(399, -90),
    "913b00773/ar"
  ];
  
  console.log('\nHash parts:');
  hashParts.forEach((p, i) => console.log('  [' + i + '] "' + p + '"'));
  
  const fullPath = hashParts.join('');
  console.log('\nFull path:', fullPath);
  
  // Test API
  const pageRes = await fetch('https://111movies.com/movie/550', { headers: HEADERS });
  const pageHtml = await pageRes.text();
  const nextDataMatch = pageHtml.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  const hashOnly = fullPath.replace('/ar', '');
  const apiUrl = 'https://111movies.com/' + hashOnly + '/' + pageData + '/ar';
  console.log('\nAPI URL:', apiUrl.substring(0, 100) + '...');
  
  const apiRes = await fetch(apiUrl, {
    headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest', 'x-cache-token': 'IWllVsuBx0Iy' }
  });
  console.log('Response:', apiRes.status);
  if (apiRes.ok) {
    const body = await apiRes.text();
    console.log('Body:', body.substring(0, 300));
  }
}

buildHash().catch(console.error);
