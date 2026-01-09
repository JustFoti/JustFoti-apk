// Deobfuscate 1movies API code
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function deobfuscate() {
  console.log('Deobfuscating 1movies...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // The code uses two decoder functions: r() and t()
  // These decode strings from an array
  
  // Find the string array - it's usually at the start
  // Pattern: var a = ["string1", "string2", ...]
  
  // First, let's find where the array is defined
  // Look for a function that returns an array
  const arrayFuncMatch = js.match(/function\s+(\w+)\s*\(\)\s*\{\s*var\s+\w+\s*=\s*\[([^\]]+)\]/);
  
  if (arrayFuncMatch) {
    console.log('Found array function:', arrayFuncMatch[1]);
    const arrayContent = arrayFuncMatch[2];
    
    // Parse the strings
    const strings = [];
    const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    let match;
    while ((match = regex.exec(arrayContent)) !== null) {
      strings.push(match[1]);
    }
    
    console.log('Array length:', strings.length);
    console.log('First 30 strings:', strings.slice(0, 30));
    
    // Now let's find the decoder functions
    // They typically look like: function r(e, t) { return a()[e - offset] }
    
    // Look for the offset
    const offsetMatch = js.match(/return\s+\w+\s*\[\s*\w+\s*-\s*(\d+)\s*\]/);
    if (offsetMatch) {
      const offset = parseInt(offsetMatch[1]);
      console.log('\nOffset:', offset);
      
      // Now we can decode!
      // From the context: r(392,-33) should give us part of the API hash
      // r(e, t) => strings[e - offset]
      
      console.log('\n=== Decoding API hash parts ===');
      
      // The m variable was built from:
      // r(392,-33)+r(409,-34)+t(1184,1222,1178,1176)+r(381,-150)+r(344,-129)+...
      
      // Let's decode each part
      const parts = [
        { fn: 'r', args: [392, -33] },
        { fn: 'r', args: [409, -34] },
        { fn: 't', args: [1184, 1222, 1178, 1176] },
        { fn: 'r', args: [381, -150] },
        { fn: 'r', args: [344, -129] },
        { fn: 'r', args: [364, -148] },
        { fn: 'r', args: [413, -112] },
        { fn: 'r', args: [362, -121] },
        { fn: 't', args: [1188, 1196, 1204, 1193] },
        { fn: 't', args: [1138, 1140, 1194, 1196] },
        { fn: 't', args: [1157, 1208, 1193, 1167] },
        { fn: 't', args: [1201, 1201, 1180, 1149] },
        { fn: 't', args: [1138, 1161, 1118, 1127] },
        { fn: 't', args: [1219, 1223, 1208, 1156] },
        { fn: 't', args: [1175, 1146, 1167, 1151] },
        { fn: 't', args: [1113, 1090, 1111, 1071] },
        { fn: 'r', args: [360, -94] },
        { fn: 't', args: [1136, 1178, 1186, 1229] },
        { fn: 'r', args: [377, -72] },
        { fn: 't', args: [1092, 1125, 1113, 1150] },
        { fn: 't', args: [1233, 1152, 1196, 1215] },
        { fn: 'r', args: [433, -37] },
        { fn: 'r', args: [389, -82] },
        { fn: 'r', args: [386, -58] },
        { fn: 't', args: [1247, 1238, 1191, 1160] },
        { fn: 'r', args: [399, -90] },
      ];
      
      // The r function uses: strings[e - offset]
      // The t function uses: r(n - 770, e) where n is the 3rd arg
      
      let apiHash = '';
      for (const part of parts) {
        let idx;
        if (part.fn === 'r') {
          idx = part.args[0] - offset;
        } else {
          // t(e, t, n, a) => r(n - 770, e)
          idx = part.args[2] - 770 - offset;
        }
        
        if (idx >= 0 && idx < strings.length) {
          const decoded = strings[idx];
          console.log(`${part.fn}(${part.args.join(',')}) => [${idx}] = "${decoded}"`);
          apiHash += decoded;
        } else {
          console.log(`${part.fn}(${part.args.join(',')}) => [${idx}] = OUT OF BOUNDS`);
        }
      }
      
      console.log('\nReconstructed API hash:', apiHash);
    }
  } else {
    console.log('Could not find array function');
    
    // Try alternative pattern - the array might be inline
    const inlineArrayMatch = js.match(/\[("[^"]+",?\s*){20,}\]/);
    if (inlineArrayMatch) {
      console.log('Found inline array');
    }
  }
  
  // Let's also look for the actual fetch call to understand the full URL structure
  console.log('\n=== Analyzing fetch call ===');
  
  const fetchIdx = js.indexOf('fetch("/"+m+"/"+p');
  if (fetchIdx > -1) {
    // Get more context
    const context = js.substring(fetchIdx - 100, fetchIdx + 300);
    console.log('Fetch context:', context);
    
    // The URL is: "/" + m + "/" + p + r(368,-104)
    // Where r(368,-104) should decode to "/sr" or similar
  }
  
  // Let's try a different approach - look for the actual API hash in the minified code
  // The hash should be a 64-character hex string
  console.log('\n=== Looking for 64-char hex patterns ===');
  
  // Look for patterns that could be parts of a hash
  const hexParts = js.match(/[a-f0-9]{8,}/gi) || [];
  const longHex = hexParts.filter(h => h.length >= 32);
  console.log('Long hex strings:', longHex);
}

deobfuscate().catch(console.error);
