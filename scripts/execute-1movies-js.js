// Execute the 1movies JS to get the actual API hash
require('dotenv').config({ path: '.env.local' });
const vm = require('vm');

const BASE_URL = 'https://111movies.com';

async function execute1moviesJS() {
  console.log('Executing 1movies JS to extract API hash...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // Extract just the part we need - the string array and decoder functions
  
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
  
  // Create a sandbox to execute the decoder
  const sandbox = {
    console: console,
    String: String,
    decodeURIComponent: decodeURIComponent,
    result: null,
  };
  
  // Build the decoder code
  const decoderCode = `
    const a = ${JSON.stringify(encodedStrings)};
    
    function MDTYJi(e) {
      let t = "", n = "";
      for (let n = 0, r, a, i = 0; a = e.charAt(i++); ~a && (r = n % 4 ? 64 * r + a : a, n++ % 4) && (t += String.fromCharCode(255 & r >> (-2 * n & 6))))
        a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=".indexOf(a);
      for (let e = 0, r = t.length; e < r; e++)
        n += "%" + ("00" + t.charCodeAt(e).toString(16)).slice(-2);
      return decodeURIComponent(n);
    }
    
    function r(e, t) {
      const idx = e - 338;
      if (idx < 0 || idx >= a.length) return "[OUT:" + idx + "]";
      return MDTYJi(a[idx]);
    }
    
    function t(e, tt, n, aa) {
      return r(n - 770, e);
    }
    
    // Build the hash
    const m = r(392,-33)+r(409,-34)+t(1184,1222,1178,1176)+r(381,-150)+r(344,-129)+r(364,-148)+r(413,-112)+r(362,-121)
      +"pTGy82DLIz"+t(1188,1196,1204,1193)+t(1138,1140,1194,1196)+t(1157,1208,1193,1167)+t(1201,1201,1180,1149)
      +"pliKjWPhvP"+t(1138,1161,1118,1127)+t(1219,1223,1208,1156)+t(1175,1146,1167,1151)+t(1113,1090,1111,1071)
      +r(360,-94)+"0363-4e1b-5482-8d76-"+t(1136,1178,1186,1229)+"4b/e993fc0bc499fdfb502f96b8596"
      +r(377,-72)+t(1092,1125,1113,1150)+t(1233,1152,1196,1215)+r(433,-37)+r(389,-82)+r(386,-58)
      +"88bf9898b9"+t(1247,1238,1191,1160)+r(399,-90)+"913b00773/ar";
    
    // Also get the endpoint suffix
    const endpoint = r(368,-104);
    
    result = { hash: m, endpoint: endpoint };
  `;
  
  try {
    vm.createContext(sandbox);
    vm.runInContext(decoderCode, sandbox);
    
    console.log('Decoded hash:', sandbox.result.hash);
    console.log('Endpoint suffix:', sandbox.result.endpoint);
    
    // The hash contains garbage because the indices are wrong
    // Let me check what the actual indices should be
    
    // Let's decode each part individually
    console.log('\n=== Individual parts ===');
    
    const parts = [
      { call: 'r(392,-33)', idx: 392 - 338 },
      { call: 'r(409,-34)', idx: 409 - 338 },
      { call: 't(1184,1222,1178,1176)', idx: 1178 - 770 - 338 },
      { call: 'r(381,-150)', idx: 381 - 338 },
      { call: 'r(344,-129)', idx: 344 - 338 },
      { call: 'r(364,-148)', idx: 364 - 338 },
      { call: 'r(413,-112)', idx: 413 - 338 },
      { call: 'r(362,-121)', idx: 362 - 338 },
      { call: 't(1188,1196,1204,1193)', idx: 1204 - 770 - 338 },
      { call: 't(1138,1140,1194,1196)', idx: 1194 - 770 - 338 },
      { call: 't(1157,1208,1193,1167)', idx: 1193 - 770 - 338 },
      { call: 't(1201,1201,1180,1149)', idx: 1180 - 770 - 338 },
      { call: 't(1138,1161,1118,1127)', idx: 1118 - 770 - 338 },
      { call: 't(1219,1223,1208,1156)', idx: 1208 - 770 - 338 },
      { call: 't(1175,1146,1167,1151)', idx: 1167 - 770 - 338 },
      { call: 't(1113,1090,1111,1071)', idx: 1111 - 770 - 338 },
      { call: 'r(360,-94)', idx: 360 - 338 },
      { call: 't(1136,1178,1186,1229)', idx: 1186 - 770 - 338 },
      { call: 'r(377,-72)', idx: 377 - 338 },
      { call: 't(1092,1125,1113,1150)', idx: 1113 - 770 - 338 },
      { call: 't(1233,1152,1196,1215)', idx: 1196 - 770 - 338 },
      { call: 'r(433,-37)', idx: 433 - 338 },
      { call: 'r(389,-82)', idx: 389 - 338 },
      { call: 'r(386,-58)', idx: 386 - 338 },
      { call: 't(1247,1238,1191,1160)', idx: 1191 - 770 - 338 },
      { call: 'r(399,-90)', idx: 399 - 338 },
      { call: 'r(368,-104)', idx: 368 - 338 },
    ];
    
    for (const part of parts) {
      if (part.idx >= 0 && part.idx < encodedStrings.length) {
        const encoded = encodedStrings[part.idx];
        const decoded = sandbox.result ? vm.runInContext(`MDTYJi("${encoded}")`, sandbox) : 'N/A';
        console.log(`${part.call} => [${part.idx}] "${encoded}" => "${decoded}"`);
      } else {
        console.log(`${part.call} => [${part.idx}] OUT OF BOUNDS`);
      }
    }
    
  } catch (e) {
    console.log('Error:', e.message);
    console.log(e.stack);
  }
  
  // Now let's try to find the REAL hash by looking at what strings look like hash parts
  console.log('\n=== Strings that look like hash parts ===');
  
  const hashLikeStrings = [];
  for (let i = 0; i < encodedStrings.length; i++) {
    try {
      const decoded = vm.runInContext(`MDTYJi("${encodedStrings[i]}")`, sandbox);
      // Check if it looks like a hash part (alphanumeric, 8-12 chars)
      if (/^[a-zA-Z0-9]{8,12}$/.test(decoded) && !/^(function|return|toString|catch|join|autoplay|timeout|click|href)$/i.test(decoded)) {
        hashLikeStrings.push({ idx: i, encoded: encodedStrings[i], decoded });
      }
    } catch (e) {
      // Skip
    }
  }
  
  console.log('Hash-like strings:');
  hashLikeStrings.forEach(s => console.log(`  [${s.idx}] "${s.decoded}"`));
}

execute1moviesJS().catch(console.error);
