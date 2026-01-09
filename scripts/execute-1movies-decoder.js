// Execute the 1movies decoder by simulating the obfuscated code
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function executeDecoder() {
  console.log('=== Executing 1movies Decoder ===\n');
  
  // Read the chunk
  let code;
  try {
    code = fs.readFileSync('1movies-860-chunk.js', 'utf8');
  } catch {
    const res = await fetch('https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js');
    code = await res.text();
    fs.writeFileSync('1movies-860-chunk.js', code);
  }
  
  // Extract the string array
  const arrayMatch = code.match(/t\s*=\s*\[((?:"[^"]*",?\s*)+)\]/);
  const strings = arrayMatch[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1));
  
  console.log('Original array (first 10):', strings.slice(0, 10));
  
  // The array is shuffled by the IIFE
  // Looking at the code: (function(e, t) { ... })(e, 789)
  // This shuffles the array by rotating it
  
  // Find the shuffle IIFE
  const shuffleMatch = code.match(/\(\s*function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{[^}]*while\s*\(\s*!!\s*\[\s*\]\s*\)[^}]*\}\s*\)\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)/);
  
  // The shuffle typically does:
  // while (true) {
  //   try {
  //     if (someCondition) break;
  //     arr.push(arr.shift());
  //   } catch { arr.push(arr.shift()); }
  // }
  
  // The target number is 789 (from the IIFE call)
  // The shuffle rotates until some checksum equals 789
  
  // Let's try to find the rotation amount
  // The checksum is typically: sum of parsed integers from decoded strings
  
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
  
  // Try different rotations
  console.log('\n=== Testing rotations ===');
  
  const targetSum = 789;
  
  function calculateChecksum(arr) {
    // The checksum is typically the sum of parseInt on decoded strings
    let sum = 0;
    for (const s of arr) {
      const decoded = customBase64Decode(s);
      const num = parseInt(decoded);
      if (!isNaN(num)) {
        sum += num;
      }
    }
    return sum;
  }
  
  // Try to find the correct rotation
  let rotatedArray = [...strings];
  let foundRotation = -1;
  
  for (let rotation = 0; rotation < strings.length; rotation++) {
    const checksum = calculateChecksum(rotatedArray);
    
    if (checksum === targetSum) {
      console.log(`Found rotation: ${rotation}, checksum: ${checksum}`);
      foundRotation = rotation;
      break;
    }
    
    // Rotate: push(shift())
    rotatedArray.push(rotatedArray.shift());
  }
  
  if (foundRotation === -1) {
    console.log('Could not find correct rotation by checksum');
    
    // Let's try a different approach - the r() function uses offset 338
    // r(392, -33) should return a hex string
    // So arr[392 - 338] = arr[54] should be a hex string
    
    console.log('\n=== Testing with offset 338 ===');
    
    // For r(392, -33) to return a hex string, arr[54] must be hex
    // Let's find which rotation makes arr[54] a hex string
    
    rotatedArray = [...strings];
    for (let rotation = 0; rotation < strings.length; rotation++) {
      const decoded54 = customBase64Decode(rotatedArray[54]);
      const decoded71 = customBase64Decode(rotatedArray[71]); // r(409, -34) -> arr[71]
      
      if (/^[a-f0-9]+$/.test(decoded54) && /^[a-f0-9]+$/.test(decoded71)) {
        console.log(`Rotation ${rotation}: arr[54]="${decoded54}", arr[71]="${decoded71}"`);
        foundRotation = rotation;
        break;
      }
      
      rotatedArray.push(rotatedArray.shift());
    }
  }
  
  // If still not found, let's try the actual shuffle algorithm
  console.log('\n=== Simulating actual shuffle ===');
  
  // The shuffle function in the code does:
  // while (true) {
  //   try {
  //     const check = -parseInt(r(338+0)) / 1 + parseInt(r(338+6)) / 2 + ...
  //     if (check === 789) break;
  //   } catch {}
  //   arr.push(arr.shift());
  // }
  
  // Let's extract the actual checksum formula from the code
  const checksumMatch = code.match(/parseInt\s*\(\s*\w+\s*\(\s*(\d+)\s*\)\s*\)\s*\/\s*(\d+)/g);
  if (checksumMatch) {
    console.log('Checksum formula parts:', checksumMatch.slice(0, 5));
  }
  
  // Let's try a simpler approach - just test all rotations and see which one
  // produces valid hex strings for the known r() calls
  
  console.log('\n=== Brute force rotation search ===');
  
  rotatedArray = [...strings];
  for (let rotation = 0; rotation < strings.length; rotation++) {
    // Decode the array
    const decoded = rotatedArray.map(s => customBase64Decode(s));
    
    // Check if r(392, -33) = decoded[54] is hex
    // Check if r(409, -34) = decoded[71] is hex
    // Check if r(381, -150) = decoded[43] is hex
    
    const val54 = decoded[54];
    const val71 = decoded[71];
    const val43 = decoded[43];
    
    const allHex = /^[a-f0-9]+$/.test(val54) && 
                   /^[a-f0-9]+$/.test(val71) && 
                   /^[a-f0-9]+$/.test(val43);
    
    if (allHex) {
      console.log(`\nRotation ${rotation} produces hex values:`);
      console.log(`  r(392,-33) = decoded[54] = "${val54}"`);
      console.log(`  r(409,-34) = decoded[71] = "${val71}"`);
      console.log(`  r(381,-150) = decoded[43] = "${val43}"`);
      
      // Build the hash with this rotation
      function r(n, e) {
        return decoded[n - 338];
      }
      
      function t(e, tt, n, a) {
        return r(n - 770, e);
      }
      
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
      console.log('\nFull URL path:', fullHash);
      
      // Check if it looks valid (no JS keywords)
      const hasKeywords = /toString|catch|join|autoplay|cript/.test(fullHash);
      if (!hasKeywords) {
        console.log('\n*** This looks like a valid hash! ***');
        break;
      } else {
        console.log('\n(Contains JS keywords, trying next rotation...)');
      }
    }
    
    rotatedArray.push(rotatedArray.shift());
  }
}

executeDecoder().catch(console.error);
