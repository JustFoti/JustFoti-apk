// Intercept 1movies API by executing the JS in a sandboxed environment
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function intercept1movies() {
  console.log('Intercepting 1movies API...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // The key insight: the r() function does base64 decode with a custom alphabet
  // Let's extract the exact function and run it
  
  // Find the string array function
  const arrayMatch = js.match(/function\s+(\w)\s*\(\)\s*\{\s*return\s+\1\s*=\s*function\s*\(\)\s*\{\s*return\s+(\w+)\s*\}/);
  
  // Find the actual array
  const arrayContentMatch = js.match(/\[("[^"]+",?\s*){50,}\]/);
  if (!arrayContentMatch) {
    console.log('Could not find string array');
    return;
  }
  
  // Parse the array
  const arrayStr = arrayContentMatch[0];
  const encodedStrings = [];
  const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
  let match;
  while ((match = regex.exec(arrayStr)) !== null) {
    encodedStrings.push(match[1]);
  }
  
  console.log('Found', encodedStrings.length, 'encoded strings');
  
  // The r function uses a custom base64 with this alphabet:
  // "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/="
  // And offset 338
  
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
  
  function customBase64Decode(encoded) {
    let result = "";
    let buffer = 0;
    let bits = 0;
    
    for (let i = 0; i < encoded.length; i++) {
      const charIndex = alphabet.indexOf(encoded[i]);
      if (charIndex === -1 || charIndex === 64) continue;
      
      buffer = (buffer << 6) | charIndex;
      bits += 6;
      
      while (bits >= 8) {
        bits -= 8;
        result += String.fromCharCode((buffer >> bits) & 0xFF);
      }
    }
    
    return result;
  }
  
  // Decode all strings
  const strings = encodedStrings.map(s => {
    try {
      return customBase64Decode(s);
    } catch (e) {
      return s;
    }
  });
  
  console.log('\nDecoded strings (first 30):');
  strings.slice(0, 30).forEach((s, i) => console.log(`  ${i}: "${s}"`));
  
  // Now let's find the ACTUAL r function implementation
  // It's: function r(t,n){let a=e();return(r=function(e,n){let i=a[e-=338];...
  
  // The key is: a[e-=338] means offset is 338
  // But then it does MORE processing on the string!
  
  // Let's look at the full r function
  const rFuncMatch = js.match(/function\s+r\s*\(\s*\w+\s*,\s*\w+\s*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
  if (rFuncMatch) {
    console.log('\n=== r function body ===');
    console.log(rFuncMatch[0].substring(0, 1000));
  }
  
  // The r function does:
  // 1. Get string from array at index (e - 338)
  // 2. If r.ipTFfY is undefined, set up r.MDTYJi (the base64 decoder)
  // 3. Decode the string using the custom base64
  
  // Let's implement the full decoder
  const offset = 338;
  
  function r(e, t) {
    const idx = e - offset;
    if (idx < 0 || idx >= encodedStrings.length) {
      return `[OUT:${idx}]`;
    }
    const encoded = encodedStrings[idx];
    return customBase64Decode(encoded);
  }
  
  function t(e, tt, n, a) {
    // t(e, t, n, a) calls r(n - 770, e)
    return r(n - 770, e);
  }
  
  // Now decode the hash parts
  console.log('\n=== Decoding hash parts ===');
  
  // From the context, the m variable is built from these parts:
  // m=r(392,-33)+r(409,-34)+t(1184,1222,1178,1176)+r(381,-150)+r(344,-129)+r(364,-148)+r(413,-112)+r(362,-121)
  // +"pTGy82DLIz"+t(1188,1196,1204,1193)+t(1138,1140,1194,1196)+t(1157,1208,1193,1167)+t(1201,1201,1180,1149)
  // +"pliKjWPhvP"+t(1138,1161,1118,1127)+t(1219,1223,1208,1156)+t(1175,1146,1167,1151)+t(1113,1090,1111,1071)
  // +r(360,-94)+"0363-4e1b-5482-8d76-"+t(1136,1178,1186,1229)+"4b/e993fc0bc499fdfb502f96b8596"
  // +r(377,-72)+t(1092,1125,1113,1150)+t(1233,1152,1196,1215)+r(433,-37)+r(389,-82)+r(386,-58)
  // +"88bf9898b9"+t(1247,1238,1191,1160)+r(399,-90)+"913b00773/ar"
  
  const hashParts = [
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
  
  console.log('Hash parts:');
  hashParts.forEach((p, i) => console.log(`  ${i}: "${p}"`));
  
  // The problem is that the decoded strings are JS keywords like "toString", "catch", etc.
  // This means the obfuscator is using a DIFFERENT array or the indices are wrong
  
  // Let me check if there's a second array in the 447 chunk
  console.log('\n=== Checking 447 chunk ===');
  
  const chunk447Url = `${BASE_URL}/_next/static/chunks/447-fe56a0e3dc1326d4.js`;
  const chunk447Res = await fetch(chunk447Url);
  const chunk447Js = await chunk447Res.text();
  
  const array447Match = chunk447Js.match(/\[("[^"]+",?\s*){50,}\]/);
  if (array447Match) {
    const array447Str = array447Match[0];
    const encoded447 = [];
    const regex447 = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    let m447;
    while ((m447 = regex447.exec(array447Str)) !== null) {
      encoded447.push(m447[1]);
    }
    
    console.log('447 chunk has', encoded447.length, 'strings');
    
    // Decode them
    const strings447 = encoded447.map(s => {
      try {
        return customBase64Decode(s);
      } catch (e) {
        return s;
      }
    });
    
    console.log('First 30 decoded strings from 447:');
    strings447.slice(0, 30).forEach((s, i) => console.log(`  ${i}: "${s}"`));
    
    // Try with 447 array
    function r447(e, t) {
      const idx = e - offset;
      if (idx < 0 || idx >= encoded447.length) {
        return `[OUT:${idx}]`;
      }
      return customBase64Decode(encoded447[idx]);
    }
    
    function t447(e, tt, n, a) {
      return r447(n - 770, e);
    }
    
    console.log('\n=== Trying with 447 array ===');
    console.log('r(392,-33):', r447(392,-33));
    console.log('r(409,-34):', r447(409,-34));
  }
  
  // Let me try a completely different approach - look for the actual API URL in the minified code
  console.log('\n=== Looking for hardcoded API parts ===');
  
  // The visible parts are:
  // "pTGy82DLIz", "pliKjWPhvP", "0363-4e1b-5482-8d76-", "4b/e993fc0bc499fdfb502f96b8596", "88bf9898b9", "913b00773/ar"
  
  // These are the LITERAL parts that are NOT decoded
  // The decoded parts fill in the gaps
  
  // Let me search for any other literal strings that look like hash parts
  const hashLikeStrings = js.match(/"[a-zA-Z0-9]{8,}"/g) || [];
  console.log('Hash-like strings:', hashLikeStrings.filter(s => !s.includes('function') && !s.includes('return')).slice(0, 30));
}

intercept1movies().catch(console.error);
