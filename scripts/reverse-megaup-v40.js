#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v40
 * 
 * BREAKTHROUGH: The keystream depends on UA characters at EVEN positions (0, 2, 4, 6, 8)!
 * 
 * Let's build a complete model that maps:
 * (keystream_position, ua_char_0, ua_char_2, ua_char_4, ua_char_6, ua_char_8) -> keystream_byte
 */

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function getKeystreamForUA(videoId, ua) {
  const baseUrl = 'https://megaup22.online';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  
  if (!mediaResponse.ok) return null;
  
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  if (!encrypted) return null;
  
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const decResult = await testDecryption(encrypted, ua);
  if (decResult.status !== 200) return null;
  
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  return keystream;
}

async function main() {
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  
  // First, let's understand which keystream positions depend on which UA positions
  console.log('=== Mapping UA positions to keystream positions ===\n');
  
  // Use a base UA with known characters
  const baseUA = 'MMMMMMMMMM'; // 10 M's
  const baseKs = await getKeystreamForUA(videoId, baseUA);
  
  if (!baseKs) {
    console.log('Failed to get base keystream');
    return;
  }
  
  // For each UA position, find which keystream positions it affects
  const uaPosToKsPos = {};
  
  for (let uaPos = 0; uaPos < 10; uaPos++) {
    // Change character at uaPos to 'A'
    const testUA = baseUA.substring(0, uaPos) + 'A' + baseUA.substring(uaPos + 1);
    const testKs = await getKeystreamForUA(videoId, testUA);
    
    if (!testKs) continue;
    
    const changedPositions = [];
    for (let i = 0; i < Math.min(baseKs.length, testKs.length); i++) {
      if (baseKs[i] !== testKs[i]) {
        changedPositions.push(i);
      }
    }
    
    uaPosToKsPos[uaPos] = changedPositions;
    console.log(`UA pos ${uaPos}: affects ${changedPositions.length} ks positions`);
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Now let's build a model for the first 517 positions (before the tail)
  // We'll focus on positions 0, 2, 4, 6, 8 since those are the main ones
  
  console.log('\n=== Building keystream model ===\n');
  
  // For simplicity, let's first handle the case where we know the UA
  // The real Mozilla UA is: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  // Chars at even positions: M, z, l, a, 5, 0, (, i, d, w, ...
  
  const realUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  console.log('Real UA:', realUA);
  console.log('Even position chars:', realUA.split('').filter((_, i) => i % 2 === 0).join(''));
  
  // Get keystream for real UA
  const realKs = await getKeystreamForUA(videoId, realUA);
  
  if (!realKs) {
    console.log('Failed to get real keystream');
    return;
  }
  
  console.log('Real keystream length:', realKs.length);
  console.log('Real keystream (first 20):', realKs.slice(0, 20).map(k => k.toString(16).padStart(2, '0')).join(' '));
  
  // Now let's try to predict the keystream by building lookup tables
  // We need to collect data for different combinations of UA chars
  
  // For a practical solution, let's use a different approach:
  // 1. Collect keystrams for many different UAs
  // 2. For each keystream position, find the pattern
  
  console.log('\n=== Collecting data for pattern analysis ===\n');
  
  // Generate test UAs with different combinations
  const testChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const keystramData = [];
  
  // Test with single-char UAs (affects only position 0)
  for (const c of testChars.substring(0, 10)) {
    const ks = await getKeystreamForUA(videoId, c);
    if (ks) {
      keystramData.push({
        ua: c,
        chars: [c.charCodeAt(0), 0, 0, 0, 0],
        keystream: ks
      });
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Test with 3-char UAs (affects positions 0, 2)
  for (const c0 of 'ABCD') {
    for (const c2 of 'ABCD') {
      const ua = c0 + 'X' + c2;
      const ks = await getKeystreamForUA(videoId, ua);
      if (ks) {
        keystramData.push({
          ua,
          chars: [c0.charCodeAt(0), c2.charCodeAt(0), 0, 0, 0],
          keystream: ks
        });
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  console.log(`Collected ${keystramData.length} samples`);
  
  // Analyze position 9 (which depends on char 4 based on earlier analysis)
  console.log('\n=== Analyzing position 9 ===\n');
  
  // Position 9 showed differences when char 4 changed
  // Let's see if we can find the pattern
  
  const pos9Values = keystramData.map(d => ({
    ua: d.ua,
    char0: d.chars[0],
    char2: d.chars[1],
    ks9: d.keystream[9]
  }));
  
  // Group by char0
  const byChar0 = {};
  for (const v of pos9Values) {
    if (!byChar0[v.char0]) byChar0[v.char0] = [];
    byChar0[v.char0].push(v);
  }
  
  for (const [char0, values] of Object.entries(byChar0)) {
    const ks9Values = [...new Set(values.map(v => v.ks9))];
    console.log(`char0=${char0} (${String.fromCharCode(parseInt(char0))}): ks9 has ${ks9Values.length} unique values: ${ks9Values.map(v => v.toString(16)).join(', ')}`);
  }
  
  // The key insight: for a given UA, we can compute the keystream
  // But we need to know the exact formula
  
  // Let's try a different approach: use the enc-dec.app API to decrypt
  // and then reverse engineer the relationship between UA and keystream
  
  console.log('\n=== Testing native decryption ===\n');
  
  // For the real UA, we have the keystream
  // Let's verify we can decrypt correctly
  
  const testEncrypted = await (async () => {
    const baseUrl = 'https://megaup22.online';
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': realUA, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    return mediaData.result;
  })();
  
  const testEncBytes = Buffer.from(testEncrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  // Decrypt using our keystream
  const ourDecrypted = [];
  for (let i = 0; i < realKs.length && i < testEncBytes.length; i++) {
    ourDecrypted.push(testEncBytes[i] ^ realKs[i]);
  }
  
  const ourDecryptedStr = Buffer.from(ourDecrypted).toString('utf8');
  console.log('Our decrypted (first 100):', ourDecryptedStr.substring(0, 100));
  
  // Verify with API
  const apiResult = await testDecryption(testEncrypted, realUA);
  const apiDecrypted = typeof apiResult.result === 'string' ? apiResult.result : JSON.stringify(apiResult.result);
  console.log('API decrypted (first 100):', apiDecrypted.substring(0, 100));
  
  // Compare
  const match = ourDecryptedStr === apiDecrypted;
  console.log('Match:', match);
  
  if (match) {
    console.log('\n*** SUCCESS! We can decrypt with the correct keystream! ***');
    console.log('\nThe challenge is computing the keystream from the UA.');
    console.log('For now, we can use a fixed keystream for a known UA.');
  }
  
  // Save the keystream for the real UA
  const fs = require('fs');
  fs.writeFileSync('megaup-keystream-mozilla.json', JSON.stringify({
    ua: realUA,
    keystream: realKs
  }));
  console.log('\nSaved keystream to megaup-keystream-mozilla.json');
}

main().catch(console.error);
