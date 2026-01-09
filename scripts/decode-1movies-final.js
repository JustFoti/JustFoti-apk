// Final decode of 1movies API hash
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

// Custom base64 decode (from the r function)
function customBase64Decode(encoded) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
  let result = "";
  let buffer = 0;
  let bits = 0;
  
  for (let i = 0; i < encoded.length; i++) {
    const charIndex = alphabet.indexOf(encoded[i]);
    if (charIndex === -1) continue;
    if (charIndex === 64) break; // '=' padding
    
    buffer = (buffer << 6) | charIndex;
    bits += 6;
    
    if (bits >= 8) {
      bits -= 8;
      result += String.fromCharCode((buffer >> bits) & 0xFF);
    }
  }
  
  return result;
}

async function decodeFinal() {
  console.log('Final decode of 1movies API hash...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // Find the string array
  const arrayMatch = js.match(/\[("[^"]+",?\s*){50,}\]/);
  const arrayStr = arrayMatch[0];
  
  // Parse the array
  const encodedStrings = [];
  const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
  let match;
  while ((match = regex.exec(arrayStr)) !== null) {
    encodedStrings.push(match[1]);
  }
  
  console.log('Found', encodedStrings.length, 'encoded strings');
  
  // Decode all strings
  const strings = encodedStrings.map(s => {
    try {
      return customBase64Decode(s);
    } catch (e) {
      return s;
    }
  });
  
  console.log('\nDecoded strings (first 20):');
  strings.slice(0, 20).forEach((s, i) => console.log(`  ${i}: "${s}"`));
  
  // The offset is 338
  const offset = 338;
  
  // Define the decoder functions
  function r(e, t) {
    const idx = e - offset;
    if (idx >= 0 && idx < strings.length) {
      return strings[idx];
    }
    return `[OUT:${idx}]`;
  }
  
  function t(e, tt, n, a) {
    // t(e, t, n, a) => r(n - 770, e)
    return r(n - 770, e);
  }
  
  // Now decode the hash parts
  console.log('\n=== Decoding hash parts ===');
  
  const parts = [
    { fn: 'r', args: [392, -33], decoded: r(392, -33) },
    { fn: 'r', args: [409, -34], decoded: r(409, -34) },
    { fn: 't', args: [1184, 1222, 1178, 1176], decoded: t(1184, 1222, 1178, 1176) },
    { fn: 'r', args: [381, -150], decoded: r(381, -150) },
    { fn: 'r', args: [344, -129], decoded: r(344, -129) },
    { fn: 'r', args: [364, -148], decoded: r(364, -148) },
    { fn: 'r', args: [413, -112], decoded: r(413, -112) },
    { fn: 'r', args: [362, -121], decoded: r(362, -121) },
    { fn: 'literal', decoded: "pTGy82DLIz" },
    { fn: 't', args: [1188, 1196, 1204, 1193], decoded: t(1188, 1196, 1204, 1193) },
    { fn: 't', args: [1138, 1140, 1194, 1196], decoded: t(1138, 1140, 1194, 1196) },
    { fn: 't', args: [1157, 1208, 1193, 1167], decoded: t(1157, 1208, 1193, 1167) },
    { fn: 't', args: [1201, 1201, 1180, 1149], decoded: t(1201, 1201, 1180, 1149) },
    { fn: 'literal', decoded: "pliKjWPhvP" },
    { fn: 't', args: [1138, 1161, 1118, 1127], decoded: t(1138, 1161, 1118, 1127) },
    { fn: 't', args: [1219, 1223, 1208, 1156], decoded: t(1219, 1223, 1208, 1156) },
    { fn: 't', args: [1175, 1146, 1167, 1151], decoded: t(1175, 1146, 1167, 1151) },
    { fn: 't', args: [1113, 1090, 1111, 1071], decoded: t(1113, 1090, 1111, 1071) },
    { fn: 'r', args: [360, -94], decoded: r(360, -94) },
    { fn: 'literal', decoded: "0363-4e1b-5482-8d76-" },
    { fn: 't', args: [1136, 1178, 1186, 1229], decoded: t(1136, 1178, 1186, 1229) },
    { fn: 'literal', decoded: "4b/e993fc0bc499fdfb502f96b8596" },
    { fn: 'r', args: [377, -72], decoded: r(377, -72) },
    { fn: 't', args: [1092, 1125, 1113, 1150], decoded: t(1092, 1125, 1113, 1150) },
    { fn: 't', args: [1233, 1152, 1196, 1215], decoded: t(1233, 1152, 1196, 1215) },
    { fn: 'r', args: [433, -37], decoded: r(433, -37) },
    { fn: 'r', args: [389, -82], decoded: r(389, -82) },
    { fn: 'r', args: [386, -58], decoded: r(386, -58) },
    { fn: 'literal', decoded: "88bf9898b9" },
    { fn: 't', args: [1247, 1238, 1191, 1160], decoded: t(1247, 1238, 1191, 1160) },
    { fn: 'r', args: [399, -90], decoded: r(399, -90) },
    { fn: 'literal', decoded: "913b00773/ar" },
  ];
  
  console.log('Decoded parts:');
  parts.forEach((p, i) => {
    if (p.fn === 'literal') {
      console.log(`  ${i}: (literal) "${p.decoded}"`);
    } else {
      console.log(`  ${i}: ${p.fn}(${p.args.join(',')}) = "${p.decoded}"`);
    }
  });
  
  const fullHash = parts.map(p => p.decoded).join('');
  console.log('\nFull hash:', fullHash);
  
  // Split by /ar to get the API hash and endpoint
  const arIdx = fullHash.lastIndexOf('/ar');
  const apiHash = fullHash.substring(0, arIdx);
  const endpoint = fullHash.substring(arIdx);
  
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
  console.log('\nTesting URL:', url.substring(0, 150) + '...');
  
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

decodeFinal().catch(console.error);
