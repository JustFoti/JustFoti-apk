// Decode 1movies hash by executing the obfuscated code in a controlled way
require('dotenv').config({ path: '.env.local' });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function decodeHash() {
  console.log('=== Decoding 1movies Hash ===\n');
  
  // Fetch the 860 chunk
  const chunkUrl = 'https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js';
  const res = await fetch(chunkUrl, { headers: HEADERS });
  const code = await res.text();
  
  // Extract the string array
  const arrayMatch = code.match(/var\s+(\w+)\s*=\s*(\[[^\]]+\])/);
  if (!arrayMatch) {
    console.log('Could not find string array');
    return;
  }
  
  const arrayName = arrayMatch[1];
  const arrayCode = arrayMatch[2];
  
  console.log('Array variable:', arrayName);
  
  // Parse the array
  let arr;
  try {
    arr = eval(arrayCode);
    console.log('Array length:', arr.length);
  } catch (e) {
    console.log('Error parsing array:', e.message);
    return;
  }
  
  // Custom base64 decode function (from the obfuscated code)
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
  const decoded = arr.map(s => customBase64Decode(s));
  console.log('\nDecoded strings (first 20):');
  decoded.slice(0, 20).forEach((s, i) => console.log(`  [${i}] ${s}`));
  
  // Find the r() function offset
  // Looking at the code: function r(n, e) { return arr[n - 789 + e] } or similar
  // The offset 789 was found earlier
  
  // Let's find the actual r() function definition
  const rFuncMatch = code.match(/function\s+r\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{([^}]+)\}/);
  if (rFuncMatch) {
    console.log('\nr() function body:', rFuncMatch[3].substring(0, 200));
  }
  
  // Let's find the t() function definition
  const tFuncMatch = code.match(/function\s+t\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{([^}]+)\}/);
  if (tFuncMatch) {
    console.log('t() function body:', tFuncMatch[5].substring(0, 200));
  }
  
  // Based on the pattern, let's try to figure out the formula
  // r(n, e) typically returns decoded[n + e - offset] or decoded[n - offset]
  // t(a, b, c, d) typically calls r(c - someOffset, a)
  
  // From the context: r(196,1215), r(433,-37), r(389,-82), r(386,-58)
  // And: t(1188,1196,1204,1193), t(1138,1140,1194,1196), etc.
  
  // Let's try to find the offset by looking at the shuffle function
  const shuffleMatch = code.match(/while\s*\(\s*!!\s*\[\s*\]\s*\)\s*\{[^}]*(\d{3,4})[^}]*\}/);
  if (shuffleMatch) {
    console.log('\nShuffle offset:', shuffleMatch[1]);
  }
  
  // Let's try different offset values
  console.log('\n=== Testing different offsets ===');
  
  // The r() function likely does: arr[n + e - offset]
  // Let's test with the known calls
  
  const testCalls = [
    { type: 'r', args: [196, 1215] },
    { type: 'r', args: [433, -37] },
    { type: 'r', args: [389, -82] },
    { type: 'r', args: [386, -58] },
    { type: 'r', args: [381, -150] },
    { type: 'r', args: [344, -129] },
    { type: 'r', args: [364, -148] },
    { type: 'r', args: [413, -112] },
    { type: 'r', args: [362, -121] },
    { type: 'r', args: [360, -94] },
    { type: 'r', args: [377, -72] },
    { type: 'r', args: [399, -90] },
  ];
  
  // Try offset 338 (from previous analysis)
  console.log('\nWith offset 338:');
  for (const call of testCalls.slice(0, 5)) {
    const idx = call.args[0] - 338;
    if (idx >= 0 && idx < decoded.length) {
      console.log(`  r(${call.args[0]}, ${call.args[1]}) -> decoded[${idx}] = "${decoded[idx]}"`);
    }
  }
  
  // Try offset 789 (found in code)
  console.log('\nWith offset 789 (n - 789):');
  for (const call of testCalls.slice(0, 5)) {
    const idx = call.args[0] - 789;
    if (idx >= 0 && idx < decoded.length) {
      console.log(`  r(${call.args[0]}, ${call.args[1]}) -> decoded[${idx}] = "${decoded[idx]}"`);
    }
  }
  
  // Try n + e - offset
  console.log('\nWith formula n + e - 1100:');
  for (const call of testCalls.slice(0, 5)) {
    const idx = call.args[0] + call.args[1] - 1100;
    if (idx >= 0 && idx < decoded.length) {
      console.log(`  r(${call.args[0]}, ${call.args[1]}) -> decoded[${idx}] = "${decoded[idx]}"`);
    }
  }
  
  // Try e - offset (second arg based)
  console.log('\nWith formula e - 770 (for t function):');
  const tCalls = [
    [1188, 1196, 1204, 1193],
    [1138, 1140, 1194, 1196],
    [1157, 1208, 1193, 1167],
    [1201, 1201, 1180, 1149],
    [1138, 1161, 1118, 1127],
    [1219, 1223, 1208, 1156],
    [1175, 1146, 1167, 1151],
    [1113, 1090, 1111, 1071],
    [1136, 1178, 1186, 1229],
    [1092, 1125, 1113, 1150],
    [1233, 1152, 1196, 1215],
    [1247, 1238, 1191, 1160],
  ];
  
  // t(e, tt, n, a) calls r(n - 770, e)
  for (const [e, tt, n, a] of tCalls.slice(0, 5)) {
    const rArg1 = n - 770;
    const idx = rArg1 - 338; // Then r() uses offset 338
    if (idx >= 0 && idx < decoded.length) {
      console.log(`  t(${e}, ${tt}, ${n}, ${a}) -> r(${rArg1}, ${e}) -> decoded[${idx}] = "${decoded[idx]}"`);
    }
  }
  
  // Let's try to build the hash with the literal parts we know
  console.log('\n=== Building hash from known parts ===');
  
  // From the context, the hash is built like:
  // r(381,-150)+r(344,-129)+r(364,-148)+r(413,-112)+r(362,-121)+"pTGy82DLIz"+
  // t(1188,1196,1204,1193)+t(1138,1140,1194,1196)+t(1157,1208,1193,1167)+t(1201,1201,1180,1149)+"pliKjWPhvP"+
  // t(1138,1161,1118,1127)+t(1219,1223,1208,1156)+t(1175,1146,1167,1151)+t(1113,1090,1111,1071)+r(360,-94)+
  // "0363-4e1b-5482-8d76-"+t(1136,1178,1186,1229)+"4b/e993fc0bc499fdfb502f96b8596"+
  // r(377,-72)+t(1092,1125,1113,1150)+t(1233,1152,1196,1215)+r(433,-37)+r(389,-82)+r(386,-58)+
  // "88bf9898b9"+t(1247,1238,1191,1160)+r(399,-90)+"913b00773/ar"
  
  // Let's find the correct offset by looking at what makes sense
  // The hash should be hex characters
  
  console.log('\nLooking for hex-like decoded strings:');
  decoded.forEach((s, i) => {
    if (/^[a-f0-9]{2,}$/.test(s)) {
      console.log(`  [${i}] ${s}`);
    }
  });
  
  // Let's also look for strings that could be part of the hash
  console.log('\nStrings that could be hash parts:');
  decoded.forEach((s, i) => {
    if (s.length >= 2 && s.length <= 20 && /^[a-zA-Z0-9]+$/.test(s)) {
      console.log(`  [${i}] ${s}`);
    }
  });
}

decodeHash().catch(console.error);
